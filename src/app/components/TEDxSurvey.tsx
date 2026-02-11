import React, { useEffect, useState, useRef } from "react";
import { Model, IQuestion } from "survey-core";
import { TEDxSurveyModel } from "../models/TEDxSurveyModel";
import { Survey as SurveyComponent } from "survey-react-ui";

export interface TEDxSurveyProps {
    json: object;
    customCss?: Record<string, string>;
    customAttributes?: Record<string, any>;
    onComplete?: (sender: TEDxSurveyModel) => void | Promise<void>;
    uploadApiUrl?: string;
    [key: string]: any;
}

const TEDxSurvey: React.FC<TEDxSurveyProps> = ({
    json,
    customCss = {},
    customAttributes = {},
    onComplete,
    uploadApiUrl,
    ...otherCallbacks
}) => {
    // 1. Initialize model
    // We use a lazy initializer, but we MUST handle updates if 'json' arrives late (async).
    const [survey] = useState(() => new TEDxSurveyModel(json));

    // 2. Handle Async JSON updates
    // If the 'json' prop updates (e.g. loaded from DB), we update the survey model.
    useEffect(() => {
        if (json && Object.keys(json).length > 0) {
            survey.fromJSON(json);
        }
    }, [json, survey]);

    // 3. Use refs for callbacks
    const onCompleteRef = useRef(onComplete);
    const otherCallbacksRef = useRef(otherCallbacks);

    useEffect(() => {
        onCompleteRef.current = onComplete;
        otherCallbacksRef.current = otherCallbacks;
    });

    useEffect(() => {
        // Apply custom attributes
        if (customAttributes) {
            Object.assign(survey, customAttributes);
        }

        // Custom CSS
        const handleUpdateCss = (_: any, options: any) => {
            const type = (options.question as IQuestion).getType();
            if (customCss[type]) {
                options.cssClasses.root += ` ${customCss[type]}`;
            }
        };
        survey.onUpdateQuestionCssClasses.add(handleUpdateCss);

        // Handle File Uploads
        const handleUploadFiles = (_: any, options: any) => {
            if (!uploadApiUrl) return;

            const formData = new FormData();
            options.files.forEach((file: File) => {
                formData.append("files", file);
            });

            // We return a promise to SurveyJS to handle the loading state
            options.callback = "success"; // optimistic update or handle async below:

            // Note: SurveyJS expects us to call options.callback with results
            // detailed implementation requires sending the fetch request:
            fetch(uploadApiUrl, {
                method: "POST",
                body: formData,
            })
                .then((res) => res.json())
                .then((data) => {
                    // Assuming backend returns { content: [{ fileId, content: 'url' }] } or similar standard SurveyJS format
                    // For simplicity, we assume the backend returns the structure SurveyJS expects:
                    // { fileId: string, content: string }[]
                    options.callback("success", data);
                })
                .catch((err) => {
                    console.error("Upload failed", err);
                    options.callback("error");
                });
        };

        if (uploadApiUrl) {
            survey.onUploadFiles.add(handleUploadFiles);
        }

        // Handle Completion
        const handleComplete = async (sender: Model) => {
            // Call user-defined callback
            if (onCompleteRef.current) {
                await onCompleteRef.current(sender as TEDxSurveyModel);
            }
        };
        survey.onComplete.add(handleComplete);

        // Bind other callbacks...
        Object.entries(otherCallbacksRef.current).forEach(([name, _]) => {
            const surveyEvent = (survey as any)[name];
            if (surveyEvent && typeof surveyEvent.add === "function") {
                const dynamicHandler = (...args: any[]) => {
                    const currentFunc = otherCallbacksRef.current[name];
                    if (typeof currentFunc === 'function') {
                        currentFunc(...args);
                    }
                };
                surveyEvent.add(dynamicHandler);
            }
        });

        // Cleanup
        return () => {
            survey.onUpdateQuestionCssClasses.remove(handleUpdateCss);
            survey.onComplete.remove(handleComplete);
            if (uploadApiUrl) {
                survey.onUploadFiles.remove(handleUploadFiles);
            }
        };
    }, [survey, customCss, uploadApiUrl]);

    return <SurveyComponent model={survey} />;
};

export default TEDxSurvey;