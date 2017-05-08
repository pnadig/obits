import {grpc, BrowserHeaders} from "grpc-web-client";
import {ItemService} from "./_proto/notes_service_pb_service";
import {Item, Items, Query, SearchQuery, Token, User} from "./_proto/notes_service_pb";

import { Component, Watch } from 'vue-typed'
import * as Vue from 'vue'

import { SearchList } from './components/search-list/search-list';
import { ItemForm } from './components/item-form/item-form';
import { ItemView } from './components/item/item';

const template = require('./app.jade')();

@Component({
	template,
    components: { SearchList, ItemView, ItemForm }
})
class App extends Vue {
    // The browser headers included in each gRPC request. Used to carry the Authorization header.
    browserHeaders: BrowserHeaders = new BrowserHeaders();

    items: Array<Item> = [];
    searchQuery: string = '';
    searchItems: Array<Item> = [];
    searchVisible: boolean = false;
    helpVisible: boolean = false;

    user:User = new User();
    host: string = 'http://localhost:9090';
    oauthUrl: string = 'https://github.com/login/oauth/authorize?client_id=b6eee37eb6240cd947fb&scope=""';

    // checks if current userId matches my public github user id, yes it's validated server-side as well
    get isAdmin(){
        return this.user.getName() === "7690509"
    }

    created(){
        // As part of our OAuth flow this page may be opened as a pop-up in order to capture
        // a temporary access token. If this is the case extract the token from the url parameters and
        // pass it back to the window which originated the popup. It will then be closed by the page which
        // opened it
        let currentHost = window.location.toString();
        let oauthCode = currentHost.replace(/.+code=/, '');
        let isPopupWindow = (oauthCode !== currentHost);

        if (isPopupWindow){
            window.opener.postMessage(oauthCode, currentHost);
        }

        // We cache a JWT in localstorage so that a session may be persisted. If one is found we verify it here.
        let session = localStorage.getItem("Authorization") || "";

        if (session !== ""){
            this.verifyJwt(session, this.getItems);
        }

        // Query the initial items which are displayed.
        this.getItems();
    }

    // Watch the search bar in the top-right and query on every change
    @Watch('searchQuery')
    onChange(query: string){
        // guard against an empty query
        if (query === '') return;

        const request = new SearchQuery();
        request.setQuery(query);

        grpc.invoke(ItemService.Search, {
            host: this.host,
            request: request,

            onMessage: (items: Items) => {
                this.searchItems = items.getItemsList();
                this.searchVisible = (this.searchItems.length != 0);
            },

            onEnd(code: grpc.Code, message:string){
                console.log(code, message);
            }
        })
    }

    // negate the property passed to this method, i.e. toggleProperty('isAdmin') will set this.isAdmin = !this.isAdmin
    toggleProperty(propName: string){
        this[propName] = !this[propName];
    }

    getItems(){
	    const request = new Query();

	    grpc.invoke(ItemService.GetItems, {
            host: this.host,
	        request: request,

            onMessage: (items: Items) => {
                this.items = items.getItemsList();
            },

            onEnd(code: grpc.Code, message: string, trailers: BrowserHeaders){}
        })
    }

    createItem(item: Item){
        // If the user is not authenticated, authenticateWithOAuth then recall this function.
        // Note that we don't verify the JWT client-side, we assume it's valid and allow it to be rejected by the server silently
        if (!this.user.getJwt()){
            this.authenticateWithOAuth(() => this.createItem(item));
            return;
        }

        const request = new Query();
        request.setItem(item);

        grpc.invoke(ItemService.AddItem, {
            host: this.host,
            request: request,

            // ensure our authentication headers are present as this must be an authenticated request
            headers: this.browserHeaders,

            onMessage: (item: Item) => {
                this.items.push(item);
            },

            onEnd(code: grpc.Code, message: string, trailers: BrowserHeaders){}
        })
    }

    deleteItem(id){
        const request = new Query();
        request.setId(id);

        grpc.invoke(ItemService.DeleteItem, {
            host: this.host,
            request: request,

            // ensure our authentication headers are present as this must be an authenticated request
            headers: this.browserHeaders,

            onMessage: (query: Query) => {
                this.items = this.items.filter(n => n.getId() !== query.getId());
            },

            onEnd(code: grpc.Code, message: string, trailers: BrowserHeaders){}
        })
    }

    // Start the Github OAuth flow which will open a popup that calls back to this page
    authenticateWithOAuth(callback: () => void){
        let win = window.open(this.oauthUrl, "Github login", 'width=800, height=600');
        let self = this;

        window.addEventListener('message', function(event){
            if (typeof event.data === 'string'){
                self.verifyOAuth(event.data, callback);
                win.close();
            }
        })
    }
    // Validate a Github Client Access token with out Github Application, returning a User object representing a public
    // Github profile.
    verifyOAuth(token:string, callback: () => void){
        const request = new Token();
        request.setToken(token);

        grpc.invoke(ItemService.VerifyOauth, {
            host: this.host,
            request: request,

            onMessage: (user: User) => {
                this.authorize(user);
                callback();
            },

            onEnd: (code: grpc.Code, message: string, trailers: BrowserHeaders) => {}
        });
    }

    // Verify a JWT server side, returning a User object
    verifyJwt(token: string, callback: () => void){
        // note that we re-use the Token message for both oauth and jwt tokens, same signature so why not
        const request = new Token();
        request.setToken(token);

        grpc.invoke(ItemService.VerifyJwt, {
            host: this.host,
            request: request,

            onMessage: (user: User) => {
                this.authorize(user);
                callback();
            },

            onEnd(code: grpc.Code, message: string, trailers: BrowserHeaders){}
        });
    }

    // Persist a session for a user by saving the JWT in local storage and setting an Authorization header
    // on future requests.
    authorize(user: User){
        this.user = user;
        localStorage.setItem("Authorization", user.getJwt());
        this.browserHeaders.set("Authorization", `${user.getJwt()}`)
    }

    login(){
        this.authenticateWithOAuth(() => {});
    }

    // End a session by stripping credentials from the controller, local-storage, and Authorization header
    logout(){
        this.user = new User();
        this.browserHeaders = new BrowserHeaders;
        localStorage.setItem("Authorization", "");
    }
}

new App().$mount('#app');