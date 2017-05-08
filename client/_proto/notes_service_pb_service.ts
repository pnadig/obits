// package: items
// file: notes_service.proto

import * as notes_service_pb from "./notes_service_pb";
export class ItemService {
  static serviceName = "items.ItemService";
}
export namespace ItemService {
  export class AddItem {
    static methodName = "AddItem";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Query;
    static responseType = notes_service_pb.Item;
  }
  export class GetItem {
    static methodName = "GetItem";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Query;
    static responseType = notes_service_pb.Item;
  }
  export class GetItems {
    static methodName = "GetItems";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Query;
    static responseType = notes_service_pb.Items;
  }
  export class UpdateItem {
    static methodName = "UpdateItem";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Query;
    static responseType = notes_service_pb.Item;
  }
  export class DeleteItem {
    static methodName = "DeleteItem";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Query;
    static responseType = notes_service_pb.Query;
  }
  export class Search {
    static methodName = "Search";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.SearchQuery;
    static responseType = notes_service_pb.Items;
  }
  export class VerifyOauth {
    static methodName = "VerifyOauth";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Token;
    static responseType = notes_service_pb.User;
  }
  export class VerifyJwt {
    static methodName = "VerifyJwt";
    static service = ItemService;
    static requestStream = false;
    static responseStream = false;
    static requestType = notes_service_pb.Token;
    static responseType = notes_service_pb.User;
  }
}
