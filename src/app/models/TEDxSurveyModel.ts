import { Model } from "survey-core";

/**
 * Custom Model for TEDx Surveys.
 * We extend the standard SurveyJS Model to add custom logic,
 * such as specific event handling or data processing methods.
 */
export class TEDxSurveyModel extends Model {
    constructor(questions: any) {
        super(questions);
    }
}
