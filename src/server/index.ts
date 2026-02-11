import dbConnect from './mongodb';
import { appendToGoogleSheet } from './googleSheets';
import { getBucket } from './gcpbucket';
import mongoose, { Schema, Model } from 'mongoose';

// Define Interface for Survey Response
interface ISurveyResponse {
    surveyId?: string;
    email: string;
    data: any; // The full JSON response from SurveyJS
    createdAt: Date;
}

// Define Mongoose Schema
const SurveyResponseSchema = new Schema<ISurveyResponse>({
    surveyId: { type: String, required: false },
    email: { type: String, required: true, index: true },
    data: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Helper to get or create the model (useful for serverless environments or hot-reload scenarios)
const getSurveyResponseModel = (): Model<ISurveyResponse> => {
    return mongoose.models.SurveyResponse || mongoose.model<ISurveyResponse>('SurveyResponse', SurveyResponseSchema);
};

/**
 * Checks if an email has already submitted a response.
 * @param email The participant's email.
 * @param mongoUri Optional MongoDB connection string.
 * @returns boolean True if duplicate exists.
 */
export async function checkDuplicateEmail(email: string, mongoUri?: string): Promise<boolean> {
    await dbConnect(mongoUri);
    const SurveyResponse = getSurveyResponseModel();
    const count = await SurveyResponse.countDocuments({ email });
    return count > 0;
}

/**
 * Saves the survey response to MongoDB.
 * @param data The survey data (must contain email if checking duplicates).
 * @param checkDuplicate If true, throws error if email exists.
 * @param mongoUri Optional MongoDB connection string.
 */
export async function saveToMongoDB(data: any, checkDuplicate: boolean = false, mongoUri?: string): Promise<any> {
    await dbConnect(mongoUri);

    const email = data.email || data.Email; // Adjust based on your survey Question Name

    if (checkDuplicate) {
        if (!email) throw new Error("Email is required for duplicate check.");
        const isDuplicate = await checkDuplicateEmail(email, mongoUri);
        if (isDuplicate) {
            throw new Error(`Submission already exists for email: ${email}`);
        }
    }

    const SurveyResponse = getSurveyResponseModel();
    const newResponse = new SurveyResponse({
        email: email || 'anonymous',
        data: data
    });

    return await newResponse.save();
}

/**
 * Uploads a file buffer to Google Cloud Storage.
 * @param fileBuffer The file content.
 * @param fileName The destination file name.
 * @param gcpConfig Configuration for GCP (credentials and bucket name)
 * @returns The public URL or filename of the uploaded file.
 */
export async function uploadToGCP(fileBuffer: Buffer, fileName: string, gcpConfig: { credentials: any; bucketName: string }): Promise<string> {
    const bucket = getBucket(gcpConfig);
    const file = bucket.file(fileName);
    await file.save(fileBuffer);

    // Make public or return signed URL (implementation depends on bucket settings)
    // For now, assuming private bucket, returning structure for SurveyJS if needed
    // or just the name. 
    return file.name;
}

/**
 * Node.js helper for handling a complete survey submission.
 * 
 * USAGE:
 * - In Next.js (API Route): import { handleSurveySubmission } from 'your-package/server';
 * - In Express: import { handleSurveySubmission } from 'your-package/server';
 * - In AWS Lambda: import { handleSurveySubmission } from 'your-package/server';
 * 
 * This aggregates Mongo, Sheets, etc. logic into one call.
 */
export async function handleSurveySubmission(
    data: any,
    options: {
        mongo?: boolean,
        mongoUri?: string,
        checkDuplicate?: boolean,
        googleSheet?: {
            spreadsheetId: string,
            range: string,
            apiKey: string,
            accessToken?: string
        },
        gcp?: {
            credentials: any,
            bucketName: string
        }
    }
) {
    const results: any = {};

    // 1. Save to MongoDB
    if (options.mongo) {
        results.mongo = await saveToMongoDB(data, options.checkDuplicate, options.mongoUri);
    }

    // 2. Save to Google Sheets
    if (options.googleSheet) {
        // Flatten data or format array as needed for your sheet
        // This is a naive implementation: values needs to be array of arrays [[val1, val2]]
        const values = [Object.values(data)];
        results.sheets = await appendToGoogleSheet(
            options.googleSheet.spreadsheetId,
            options.googleSheet.range,
            options.googleSheet.apiKey,
            values,
            options.googleSheet.accessToken
        );
    }

    return results;
}
