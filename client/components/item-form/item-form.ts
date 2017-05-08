import * as Vue from 'vue';
import { Component } from 'vue-typed';
import {Item} from "../../_proto/notes_service_pb";

import * as TagsInput from 'vue-tagsinput';

const template = require('./item-form.jade')();

@Component({
    template,
    components: { TagsInput }
})
export class ItemForm extends Vue {
    error: string = '';

    link: string =  '';
    title: string = '';
    author: string = '';
    published: number = 2017;
    description: string = '';
    tags: Array<string> = [];

    get hasError(){
        return this.error !== '';
    }

    updateTags(idx, tag){
        if (tag === undefined){
            this.tags.splice(idx, 1)
        } else {
            this.tags.push(tag);
        }
    }

    noop(){}

    // basic form validation
    validateForm(){
        let missingFields: Array<String> = [];
        if (this.link === "") missingFields.push("link");
        if (this.title === "") missingFields.push("title");
        if (this.author === "") missingFields.push("author");
        if (this.description === "") missingFields.push("description");
        if (this.tags === []) missingFields.push("tags");

        if (missingFields.length > 0){
            this.error = "Missing fields: " + missingFields.join(", ");
        }
    }

    submitForm(){
        this.error = "";

        this.validateForm();

        if (this.error !== ""){
            return;
        }

        // For some reason this feels dirty to write, todo: model based forms.
        let item = new Item();
        item.setLink(this.link);
        item.setTitle(this.title);
        item.setAuthor(this.author);
        item.setPublished(this.published);
        item.setDescription(this.description);
        item.setTagsList(this.tags);
        this.$emit("createItem", item);
        this.link = '';
        this.title = '';
        this.author = '';
        this.published = 2017;
        this.description = '';
        this.tags = [];
    }
}