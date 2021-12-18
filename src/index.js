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
const DEBOUNCE_TIME = 250;

let t;

let wrapper;

let source_el;
let source_lang = 'en'; // English

let target_el;
let target_lang = 'fa'; // Persian

let input;

let debounce;

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

	// /* DOM load */
	wrapper = dom();

	// /* Load inputs */
	load();
}

const langIsRtl = (lang) => !!rtlLanguages.find(l => l === lang);

const load = () => {
	wrapper.append(
		createEl(
			'main',
			{
				class: 'sections w-full'
			},
			[loadTarget(), loadSource()]
		)
	);
}

const loadSource = () => {
	const isRtl = langIsRtl(source_lang);

	source_el = createEl('textarea', {
		value: TEXT_GROUP.TargetInputPlaceholder,
		class: `text-${isRtl ? 'r' : 'l'} dir-${isRtl ? 'ltr' : 'rtl'}`,
		disabled: 1,
	});

	const targetSection = createEl(
		'section',
		{
			class: 'section'
		},
		source_el
	);

	return targetSection;
}

const loadTarget = () => {
	const isRtl = langIsRtl(target_lang);

	target_el = createEl('textarea', {
		class: `text-${isRtl ? 'r' : 'l'} dir-${isRtl ? 'rtl' : 'ltr'}`,
		autofocus: true,
	});

	const sourceSection = createEl(
		'section',
		{
			class: 'section'
		},
		target_el
	);

	target_el.addEventListener('input', onInputChange);
	return sourceSection;
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

const onInputChange = () => {
	input = target_el.value;

	if (debounce) clearTimeout(debounce);
	debounce = setTimeout(translateSnapshot, DEBOUNCE_TIME);
}

const translateSnapshot = () => {
	if (input.length === 0) target_el.value = TEXT_GROUP.TargetInputPlaceholder;
	else {
		translate(input).then(data => {
			source_el.value = data.TranslatedText;
		})
	}
}

const translate = (text, lang = undefined) => {
	try {
		return new Promise((done, reject) => {
			t.translateText(
				{
					Text: text,
					SourceLanguageCode: source_lang,
					TargetLanguageCode: lang ?? target_lang,
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