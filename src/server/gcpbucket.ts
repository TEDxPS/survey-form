// import { readFileSync } from 'fs';
import { Storage } from "@google-cloud/storage";

let cachedStorage: Storage | null = null;
let cachedBucket: any = null;

export const getBucket = (config: {
    credentials: any; // The entire JSON object from Google Service Account
    bucketName: string;
}) => {
    if (cachedStorage && cachedBucket?.name === config.bucketName) {
        return cachedBucket;
    }

    cachedStorage = new Storage({
        credentials: config.credentials,
    });

    cachedBucket = cachedStorage.bucket(config.bucketName);
    return cachedBucket;
};
