package main

/**
 * server.go
 *
 * This program launches an http-server capable of responding to requests from GRPC-web compatible clients. Though
 * well-documented it contains no tests and should be seen only as a demo for similar programs. It uses elastic search
 * as both a search index and primary data store, utilizing my library elastic-gopher to provide a Mongo-like
 * interface for CRUD operations. It provides authentication via JWT and Github OAuth, using a client-sided
 * OAuth flow that merely validates a token using Github application credentials on the server side.
 *
 * Done over I would've focused on building GRPC testing first. Slotted as the last feature of the project I've decided
 * to include no tests rather then half-baked tests in order to rush the release. Tale as old as time unfortunately.
 *
 * It was quite powerful to use elastic search as the fundamental building block of this project because of how easy
 * it was to include very robust search from the beginning. OAuth with Github was also useful though it remains
 * the most time-consuming operation done by the user. Furthermore I really need to improve the elastic-gopher library,
 * though fortunately I now know many ways to do so.
 *
 * Thanks for reading and hope you enjoy this program.
 *
 */

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	elastic "github.com/b3ntly/elastic-gopher"
	proto "github.com/b3ntly/obits/server/_proto"
	"github.com/google/go-github/github"
	"github.com/grpc-ecosystem/go-grpc-middleware/auth"
	"github.com/grpc-ecosystem/go-grpc-middleware/util/metautils"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/robbert229/jwt"
	"golang.org/x/net/context"
	"golang.org/x/oauth2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/metadata"
)

var (
	// Ports to run the http server which proxies to GRPC
	PORT = 9090

	//
	ELASTICSEARCH_PORT = 9200

	//
	ELASTICSEARCH_HOST = "elasticsearch"

	// Wrapper around an Elasticsearch index, akin to a database in Mongo
	INDEX *elastic.Index

	// Wrapper around an Elasticsearch type, akin to a collection in Mongo
	COLLECTION *elastic.Type

	// Github client_id
	OBITS_CLIENT_ID = os.Getenv("OBITS_CLIENT_ID")

	// Github client_secret
	OBITS_CLIENT_SECRET = os.Getenv("OBITS_CLIENT_SECRET")

	// Secret key used for signing JWTs
	OBITS_JWT_SECRET = os.Getenv("OBITS_JWT_SECRET")

	// Hashing algorithm for signing
	OBITS_JWT_ALGO = jwt.HmacSha256(OBITS_JWT_SECRET)
)

// Struct-serialized JSON request used to obtain a Github OAuth access token from a user's temporary client token
type GithubVerification struct {
	ClientId     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Code         string `json:"code"`
}

func main() {
	host := fmt.Sprintf("http://%v:%v", ELASTICSEARCH_HOST, ELASTICSEARCH_PORT)

	// Instantiate an elastic-gopher client which provides a Mongo-like API for elasticsearch
	var db *elastic.Session
	var err error


	fmt.Println(host)

	db, err = elastic.New(&elastic.Options{ Url: host })

	if err != nil {
		log.Println(err)
		os.Exit(-1)
	}

	INDEX = db.I("item")
	COLLECTION = INDEX.T("item")

	grpcServer := grpc.NewServer(
		// Interceptors are essentially middleware for GRPC, this one checks for an Authorization header and serializes
		// a userId into the context if a valid authorization token is present.
		grpc.UnaryInterceptor(grpc_auth.UnaryServerInterceptor(Authenticate)),
	)

	// Register our ItemService with the grpcServer
	proto.RegisterItemServiceServer(grpcServer, &itemService{})

	grpclog.SetLogger(log.New(os.Stdout, "GRPC:", log.LstdFlags))

	// Translate valid http requests into GRPC request and responses
	wrappedServer := grpcweb.WrapServer(grpcServer)

	// Proxy all http requests to the GRPC layer
	handler := func(res http.ResponseWriter, req *http.Request) {
		wrappedServer.ServeHTTP(res, req)
	}

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", PORT),
		Handler: http.HandlerFunc(handler),
	}

	// Start the server, this is a blocking call
	grpclog.Println("Starting server...")
	log.Fatalln(httpServer.ListenAndServe())
}

// Middleware for authorizing requests
func Authenticate(ctx context.Context) (context.Context, error) {
	// Extract Authorization header from the given context, it's serialized so we use these helper functions to get it
	token := metautils.ExtractIncoming(ctx).Get("Authorization")

	// token will be "" if the header is missing or if it is literally an empty string
	// This isn't an error because we allow unauthenticated requests as well as authenticated ones.
	if token == "" {
		return context.WithValue(ctx, "userId", ""), nil
	}

	// Validate and parse the JWT, returning a user-id.
	id, err := parseToken(token)

	// parseToken will return an error if it is not a valid token, but we still wish to continue the request so
	// we return a context without a userId and not the error
	if err != nil {
		newCtx := context.WithValue(ctx, "userId", "")
		return newCtx, nil
	}

	// User is authenticated, return a context containing the user's id
	newCtx := context.WithValue(ctx, "userId", id)
	return newCtx, nil
}

// Wrapper struct which will contain controller methods and fulfill the ItemService interface
type itemService struct{}

// Insert the given item into elastic search. Note this is entirely schemaless and doesn't have any validation.
// Return the inserted item on valid insert.
func (is *itemService) AddItem(ctx context.Context, req *proto.Query) (*proto.Item, error) {
	// GRPC-web will log header issues if we don't send something via SendHeader... maybe a bug or an oversight on my part.
	// Regardless I'm quieting it for now by calling this statement.
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	// Attempt to extract the userId from the context.
	userId := ctx.Value("userId").(string)

	// This is an authenticated route so bounce if the user is not authenticated.
	if userId == "" {
		return nil, errors.New("Unauthenticated.")
	}

	// Overload the requests userId which could have been set by a malicious user
	req.Item.User = userId

	// Same for createdAt, although that would be mischievous and not malicious
	req.Item.CreatedAt = time.Now().Unix()

	id, err := COLLECTION.Insert(req.Item)

	if err != nil {
		return nil, err
	}

	if id == "" {
		return nil, errors.New("Unable to insert into collection.")
	}

	return req.Item, nil
}

// Query a single item by its id
func (is *itemService) GetItem(ctx context.Context, req *proto.Query) (*proto.Item, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	result, err := COLLECTION.FindById(req.Id)

	if err != nil {
		return nil, err
	}

	item := &proto.Item{}
	err = json.Unmarshal(*result.Document, item)

	if err != nil {
		return nil, err
	}

	item.Id = result.Id
	return item, nil
}

// Query all items. This has no set limit and thus could cause out-of-memory errors or exceed whatever the default
// response size limit is for GRPC. Our elastic-gopher library does returns serialized results that our not compatible
// with our response so we must re-serialize them into the desired response object.
func (is *itemService) GetItems(ctx context.Context, req *proto.Query) (*proto.Items, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	results, err := COLLECTION.Find()

	if err != nil {
		return nil, err
	}

	// Build the response item.
	response := &proto.Items{}
	items := []*proto.Item{}

	for _, result := range results {
		// Result may be nil, and thus must be guarded against to prevent a nil pointer dereference
		if result == nil {
			continue
		}

		// Similarly result.Document may be nil and we must guard against a nil pointer-dereference
		if result.Document == nil {
			continue
		}

		item := &proto.Item{}

		err = json.Unmarshal(*result.Document, item)

		if err != nil {
			return nil, err
		}

		// The Id property is separate from the Document property and thus must be appended afterwards.
		item.Id = result.Id
		items = append(items, item)
	}

	response.Items = items
	return response, nil
}

// Update an item by Id.
func (is *itemService) UpdateItem(ctx context.Context, req *proto.Query) (*proto.Item, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	userId := ctx.Value("userId").(string)

	// This is an authenticated action, so bounce if the user is not authenticated.
	if userId == "" {
		return nil, errors.New("Unauthenticated.")
	}

	// This is also an admin restricted action, so bounce if the user is not an admin.
	if !isAdmin(userId) {
		return nil, errors.New("You're not an administrator.")
	}

	err, ok := COLLECTION.UpdateById(req.Id, req.Item)

	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errors.New("Failed to updated Item.")
	}

	return req.Item, nil
}

// Delete an admin by Id. This action is admin-only.
func (is *itemService) DeleteItem(ctx context.Context, req *proto.Query) (*proto.Query, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	userId := ctx.Value("userId").(string)

	// This action is authenticated only, so bounce if the user was not authenticated.
	if userId == "" {
		return nil, errors.New("Unauthenticated.")
	}

	// This is also an admin restricted action, so bounce if the user is not an admin.
	if !isAdmin(userId) {
		return nil, errors.New("You're not an administrator.")
	}

	err, ok := COLLECTION.DeleteById(req.Id)

	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errors.New("Failed to delete Item.")
	}

	return req, nil
}

// Search all items. Our Elastic-gopher library has a hard limit of 10 or 20 IIRC.
func (is *itemService) Search(ctx context.Context, req *proto.SearchQuery) (*proto.Items, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	results, err := INDEX.Search(req.Query)

	if err != nil {
		return nil, err
	}

	// See FindItems() to better understand how and why we must re-serialize the result object for return.
	response := &proto.Items{}
	items := []*proto.Item{}

	for _, result := range results {
		if result == nil {
			continue
		}

		if result.Document == nil {
			continue
		}

		item := &proto.Item{}

		err = json.Unmarshal(*result.Document, item)

		if err != nil {
			return nil, err
		}

		item.Id = result.Id
		items = append(items, item)
	}

	response.Items = items
	return response, nil
}

// Verify OAuth takes a client-side access token for the Github API, validates it, and returns a JWT for the given
// authenticated user. This involves two separate http requests and creates an OAuth authenticated http-client to make
// the requests. It strikes me that this is an inefficient use of resources, as ideally said client would be pooled for
// re-use. HTTP requests in Go also run into errors such as "Too many open files" representing a resource constraint or
// leak from open file handles. If this program begins throwing such an error it is very likely originating from this
// function.
func (is *itemService) VerifyOauth(ctx context.Context, req *proto.Token) (*proto.User, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	// Serialize our first request to convert the client token into a server token for our Github application.
	gh := &GithubVerification{
		ClientId: OBITS_CLIENT_ID, ClientSecret: OBITS_CLIENT_SECRET, Code: req.Token,
	}

	// Marshal our request.
	body, err := json.Marshal(gh)

	if err != nil {
		return nil, err
	}

	// Convert our request into an IOWriter for http.Post
	reader := bytes.NewReader(body)

	// Make the post request
	resp, err := http.Post("https://github.com/login/oauth/access_token", "application/json", reader)

	if err != nil {
		return nil, err
	}

	// Ensure we close out body, this is a very common source of memory leaks in Go.
	defer resp.Body.Close()
	contents, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	// Our server access token is serialized as x-www-form-urlencoded so we deserialize it with this one liner.
	// It seemed a better alternative then dragging in a library to do it.
	accessToken := strings.Split(strings.Split(string(contents), "=")[1], "&")[0]

	// Authenticate a new HTTP client with our access token to authorize future requests with the Github API
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: accessToken},
	)
	tc := oauth2.NewClient(ctx, ts)

	// Use a Github client library with our authenticated HTTP client. I used this more involved implementation
	// in case I found future uses for the Github API in this project.
	client := github.NewClient(tc)

	// Get the currently authenticated user's Github API so that we may extract it's user-id.
	githubUser, _, err := client.Users.Get(ctx, "")

	if err != nil {
		return nil, err
	}

	// Convert the Id to a string that may be serialized into the JWT.
	userId := strconv.Itoa(*githubUser.ID)
	claims := jwt.NewClaim()

	claims.Set("id", userId)
	jwtToken, err := OBITS_JWT_ALGO.Encode(claims)
	if err != nil {
		return nil, err
	}

	// Return the user object. Name is just the id which is also serialized into the token.
	user := &proto.User{
		Name: userId,
		Jwt:  jwtToken,
	}

	return user, nil
}

// Verify a JWT and return its corresponding User-object if valid.
func (is *itemService) VerifyJwt(ctx context.Context, req *proto.Token) (*proto.User, error) {
	grpc.SendHeader(ctx, metadata.Pairs("Pre-Response-Metadata", "Is-sent-as-headers-unary"))

	// Validate the token then parse it's serialized contents to return a user-id
	id, err := parseToken(req.Token)

	if err != nil {
		return nil, err
	}

	return &proto.User{Jwt: req.Token, Name: id}, nil
}

// Validate a JWT string and return it's serialized userId
func parseToken(token string) (string, error) {
	if token == "" {
		return "", errors.New("No token")
	}

	// Validate the token
	if err := OBITS_JWT_ALGO.Validate(token); err != nil {
		return "", err
	}

	// Decode the token
	claims, err := OBITS_JWT_ALGO.Decode(token)

	if err != nil {
		return "", err
	}

	// Get the id token
	id, err := claims.Get("id")

	if err != nil {
		return "", err
	}

	// Caste the token to a string
	idStr, ok := id.(string)

	// Return an error if token could not be caste to a string
	if !ok {
		return "", errors.New(fmt.Sprintf("Could not caste id to string: %v", id))
	}

	return idStr, nil
}

// Match the user-id against my personal (public) github user-id. I'm the only admin.
func isAdmin(userId string) bool {
	return userId == "7690509"
}