import * as AWS from 'aws-sdk';
import config from './constants/aws-account.config.json';
import supportedLanguages from './constants/supported-languages.json';

/* Variables */
let t;

let source_language = 'en'; // English

let target_language = 'fa'; // Persian

/* Development */
const init = () => {
	/**
	 * Update config
	 * loadFromPath is not supported in browser side
	 */
	AWS.config.region = config.Region;
	AWS.config.credentials = new AWS.CognitoIdentityCredentials({
		IdentityPoolId: config.IDENTITY_POOL_ID,
	});

	// Setup translator
	setup();
}

const setup = () => {
	t = new AWS.Translate({
		apiVersion: config.APP_VERSION
	});
}

const handleError = (e) => {
	console.error(e);
}

const translate = (text, cb) => {
	t.translateText(
		{
			Text: text,
			SourceLanguageCode: target_language,
			TargetLanguageCode: source_language,
		},
		(e, data) => {
			if (e) console.error(e);
			else cb(data);
		}
	)
}

document.addEventListener('DOMContentLoaded', init);