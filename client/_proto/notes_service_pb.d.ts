// package: items
// file: notes_service.proto

import * as jspb from "google-protobuf";

export class Item extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getLink(): string;
  setLink(value: string): void;

  getTitle(): string;
  setTitle(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getCompany(): string;
  setCompany(value: string): void;

  getPublished(): number;
  setPublished(value: number): void;

  getDescription(): string;
  setDescription(value: string): void;

  clearTagsList(): void;
  getTagsList(): Array<string>;
  setTagsList(value: Array<string>): void;
  addTags(value: string, index?: number): void;

  getUser(): string;
  setUser(value: string): void;

  getCreatedAt(): number;
  setCreatedAt(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Item.AsObject;
  static toObject(includeInstance: boolean, msg: Item): Item.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Item, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Item;
  static deserializeBinaryFromReader(message: Item, reader: jspb.BinaryReader): Item;
}

export namespace Item {
  export type AsObject = {
    id: string,
    link: string,
    title: string,
    author: string,
    company: string,
    published: number,
    description: string,
    tagsList: Array<string>,
    user: string,
    createdAt: number,
  }
}

export class Items extends jspb.Message {
  clearItemsList(): void;
  getItemsList(): Array<Item>;
  setItemsList(value: Array<Item>): void;
  addItems(value?: Item, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Items.AsObject;
  static toObject(includeInstance: boolean, msg: Items): Items.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Items, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Items;
  static deserializeBinaryFromReader(message: Items, reader: jspb.BinaryReader): Items;
}

export namespace Items {
  export type AsObject = {
    itemsList: Array<Item.AsObject>,
  }
}

export class Query extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  hasItem(): boolean;
  clearItem(): void;
  getItem(): Item | undefined;
  setItem(value?: Item): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Query.AsObject;
  static toObject(includeInstance: boolean, msg: Query): Query.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Query, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Query;
  static deserializeBinaryFromReader(message: Query, reader: jspb.BinaryReader): Query;
}

export namespace Query {
  export type AsObject = {
    id: string,
    item?: Item.AsObject,
  }
}

export class SearchQuery extends jspb.Message {
  getQuery(): string;
  setQuery(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SearchQuery.AsObject;
  static toObject(includeInstance: boolean, msg: SearchQuery): SearchQuery.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SearchQuery, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SearchQuery;
  static deserializeBinaryFromReader(message: SearchQuery, reader: jspb.BinaryReader): SearchQuery;
}

export namespace SearchQuery {
  export type AsObject = {
    query: string,
  }
}

export class Token extends jspb.Message {
  getToken(): string;
  setToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Token.AsObject;
  static toObject(includeInstance: boolean, msg: Token): Token.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Token, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Token;
  static deserializeBinaryFromReader(message: Token, reader: jspb.BinaryReader): Token;
}

export namespace Token {
  export type AsObject = {
    token: string,
  }
}

export class User extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getJwt(): string;
  setJwt(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): User.AsObject;
  static toObject(includeInstance: boolean, msg: User): User.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: User, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): User;
  static deserializeBinaryFromReader(message: User, reader: jspb.BinaryReader): User;
}

export namespace User {
  export type AsObject = {
    name: string,
    jwt: string,
  }
}

