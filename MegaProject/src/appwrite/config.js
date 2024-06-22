import conf from '../conf.js';
import {Client, ID, Databases, Storage, Query } from "appwrite";

export class Service{
    client = new Client();
    databases;
    bucket;

    constructor(){
        this.client
            .setEndpoint(conf.appWriteUrl)
            .setProject(conf.appWriteProjectId);
        this.databases = new Databases(this.client);
        this.bucket = new Storage(this.client);
    }

    async createPost({title,slug, content, featuredImage,status,userId}){
       try {
            return await this.databases.createDocument(
                conf.appWriteDatabaseId,
                conf.appWriteCollectionId,
                slug,
                {
                    title,
                    content,
                    featuredImage,
                    status,
                    userId,
                }

            )
       } catch (error) {
            console.log("Appwrite serice :: creeatePost :: error", error);
       } 
    }
    async updatedPost(slug, {title, content, featuredImage,status}){
        try {
            return await this.databases.updateDocument(
                conf.appWriteDatabaseId,
                conf.appWriteCollectionId,
                slug,
                {
                    title,
                    content,
                    featuredImage,
                    status,
                }
            )
        } catch (error) {
            console.log("appwrite service :: updatePost :: error",error);
            
        }
    }
    async deletePost(slug){
            try {
               return await this.databases.deleteDocument(
                conf.appWriteDatabaseId,
                conf.appWriteCollectionId,
                slug
               )
            //    return true;
            } catch (error) {
                console.log("appwrite :: deletePost :: error",error);
                // return false;
            }
    }
    async getPost({slug}){
        try {
            return await this.databases.getDocument(
                conf.appWriteDatabaseId,
                conf.appWriteCollectionId,
                slug
            )
        } catch (error) {
            console.log("appwrite :: getPost :: error",error);
        }
    }
    async getPosts(queries = [Query.equal("status","active")]){
        try {
            return await this.databases.listDocuments(
                conf.appWriteDatabaseId,
                conf.appWriteCollectionId,
                queries,
            )
        } catch (error) {
            console.log("appwrite :: getPost :: error",error)
        }
    }

    // file upload service

    async uploadFile(file){
        try {
            return await this.bucket.createFile(
                conf.appWriteBucketId,
                ID.unique(),
                file
            )
        } catch (error) {
            console.log("appwrite service :: uploadfile :: error",error);
        }
    }

    async deleteFile(fileId){
        try {
            return await this.bucket.deleteFile(
                conf.appWriteBucketId,
                fileId
            )
        } catch (error) {
            console.log("appwrite service :: deletefile :: error",error);
        }
    }

    getFilePreview(fileId){
        return this.bucket.getFilePreview(
            conf.appwriteBucketId,
            fileId
        )
    }


}

const service = new Service();
export default service