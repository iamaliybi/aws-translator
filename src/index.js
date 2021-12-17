import * as AWS from 'aws-sdk';

// DOM
import dom, { createEl } from './dom';

// Constants
import config from './constants/aws-account.config.json';
import supportedLanguages from './constants/supported-languages.json';
import rtlLanguages from './constants/rtl-languages.json';

// Styles
import './assets/scss/app.scss';

/* Default text */
const TEXT_GROUP = {
	TargetInputPlaceholder: 'Translate'
};

/* Variables */
let t;

let wrapper;

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

	/* Translate Default Text */
	translate("Hello").then(data => {
		console.log(data.TranslatedText)
	})

	/* Setup Languages */
	// source_lang = handleLanInLs('source-lang', source_lang);
	// target_lang = handleLanInLs('target-lang', target_lang);

	// /* DOM load */
	// wrapper = dom();

	// /* Load inputs */
	// load();
}

const langIsRtl = (lang) => !!rtlLanguages.find(l => l === lang);

const load = () => {
	wrapper.append(
		createEl(
			'main',
			{
				class: 'sections w-full'
			},
			[loadSource(), loadTarget()]
		)
	);
}

const loadSource = () => {
	const isRtl = langIsRtl(source_lang);

	const sourceSection = createEl(
		'section',
		{
			class: 'section'
		},
		createEl('textarea', {
			class: `text-${isRtl ? 'r' : 'l'}`,
			autofocus: true,
		})
	);

	return sourceSection;
}

const loadTarget = () => {
	const isRtl = langIsRtl(target_lang);

	const targetSection = createEl(
		'section',
		{
			class: 'section'
		},
		createEl('textarea', {
			placeholder: translate('Translation'),
			class: `text-${isRtl ? 'r' : 'l'}`,
			autofocus: true,
			disabled: 1,
		})
	);

	return targetSection;
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

const translate = (text) => {
	try {
		return new Promise((done, reject) => {
			t.translateText(
				{
					Text: text,
					SourceLanguageCode: source_lang,
					TargetLanguageCode: target_lang,
				},
				(e, data) => {
					if (e) {
						handleError(e);
						reject(e);
					}
					else done(data);
				}
			);
	
			localStorage.setItem('source-lang', source_lang);
			localStorage.setItem('target-lang', target_lang);
		})
	} catch (e) {
		handleError(e);
	}
}

document.addEventListener('DOMContentLoaded', init);