import * as AWS from 'aws-sdk';
import config from './constants/aws-account.config.json';
import supportedLanguages from './constants/supported-languages.json';

/* Variables */
let t;

let source_lang = 'en'; // English

let target_lang = 'fa'; // Persian

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
	/* Setup AWS Translator */
	t = new AWS.Translate({
		apiVersion: config.APP_VERSION
	});

	/* Setup Languages */
	source_lang = handleLanInLs('source-lang', source_lang);
	target_lang = handleLanInLs('target-lang', target_lang);
}

const handleLanInLs = (key, defaultLang) => {
	const value = localStorage.getItem(key);

	if (!value) localStorage.setItem(key, defaultLang);
	else {
		const findLang = supportedLanguages.find(lang => lang.code === value);

		// If not valid lang
		if (!findLang) localStorage.setItem(key, defaultLang);
	}

	return localStorage.getItem(key);
}

const handleError = (e) => {
	console.error(e);
}

const translate = (text, cb) => {
	try {
		t.translateText(
			{
				Text: text,
				SourceLanguageCode: source_lang,
				TargetLanguageCode: target_lang,
			},
			(e, data) => {
				if (e) handleError(e);
				else cb(data);
			}
		);

		localStorage.setItem('source-lang', source_lang);
		localStorage.setItem('target-lang', target_lang);
	} catch (e) {
		handleError(e);
	}
}

document.addEventListener('DOMContentLoaded', init);