import * as Vue from 'vue';
import { Component, Prop } from 'vue-typed';
import { Item } from '../../_proto/notes_service_pb';
import { ItemView } from '../item/item';

const template = require('./search-list.jade')();

@Component({
    template,
    components: { ItemView }
})
export class SearchList extends Vue {
    @Prop()
    items: Array<Item> = [];

    @Prop()
    visible: boolean = false;

    @Prop()
    isAdmin: boolean = false;

    get classes():boolean {
        return this.visible
    }

    toggleSearch(){
        this.$emit('toggleSearch');

    }

    deleteItem(id){
        this.$emit('deleteItem', id)
    }
}