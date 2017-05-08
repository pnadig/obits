import * as Vue from 'vue';
import { Component, Prop } from 'vue-typed';
import {Item} from "../../_proto/notes_service_pb";

const template = require('./item.jade')();

@Component({
    template
})
export class ItemView extends Vue {
    extractHostname:RegExp = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;

    @Prop()
    item: Item;

    @Prop()
    isAdmin: boolean;

    get hostname(){
        let val = this.extractHostname.exec(this.item.getLink());
        if (val === null || val.length < 1){
            return this.item.getLink();
        }

        return val[0];
    }

    get description(){
        let description = this.item.getDescription();

        if (description.length <= 140){
            return description;
        }

        return this.item.getDescription().substring(0, 140) + '...'
    }

    // emit to parent controller, because this should be handled in index.ts
    deleteItem(id){
        let result = this.$emit('deleteItem', id);
    }
}