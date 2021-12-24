import * as AWS from 'aws-sdk';

// DOM
import dom, { createEl, textToHtml } from './dom';

// Constants
import config from './constants/aws-account.config.json';
import supportedLanguages from './constants/supported-languages.json';
import rtlLanguages from './constants/rtl-languages.json';

// Styles
import './assets/scss/app.scss';

/* Default text */
const TEXT_GROUP = {
	TargetInputPlaceholder: 'Translate',
};

/* Variables */
const DEBOUNCE_TIME = 250;

let t;

let wrapper;

let source_input;
let source_select;
let source_lang = 'en'; // English

let target_input;
let target_select;
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

	// Translate page & Load
	translatePage().then(() => {
		wrapper = dom();
		load();
	});
}

const translatePage = () => {
	return new Promise(done => {
		const promises = [];
		Object.keys(TEXT_GROUP).forEach(key => {
			promises.push(
				new Promise(async (done) => {
					const t = await translate(TEXT_GROUP[key]);
					done([key, t.TranslatedText]);
				})
			);
		});

		Promise.all(promises).then((values) => {
			values.forEach(([key, value]) => {
				TEXT_GROUP[key] = value;
			});

			done();
		});
	})
}

const alignByLang = (el, lang) => {
	const isRtl = !!rtlLanguages.find(l => l === lang);

	const textAlign = isRtl ? 'text-right' : 'text-left';
	const direction = isRtl ? 'rtl' : 'ltr';

	el.style.textAlign = textAlign;
	el.style.direction = direction;
}

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

	loadLangSwitcher();
}

const loadSource = () => {
	source_input = createEl('textarea', {
		placeholder: TEXT_GROUP.TargetInputPlaceholder,
		disabled: 1,
	});
	alignByLang(source_input, target_lang);

	const targetSection = createEl(
		'section',
		{
			class: 'section'
		},
		source_input
	);

	return targetSection;
}

const loadTarget = () => {
	target_input = createEl('textarea', {
		autofocus: true,
	});
	alignByLang(target_input, source_lang);

	const sourceSection = createEl(
		'section',
		{
			class: 'section'
		},
		target_input
	);

	target_input.addEventListener('input', onInputChange);
	return sourceSection;
}

const createSwitcher = (value, name, options = [], cb = undefined) => {
	const minifiedOptions = [];
	options.forEach(lang => {
		const o = { value: lang.id };
		if (value === lang.id) o.selected = true;

		minifiedOptions.push(
			createEl(
				'option',
				o,
				lang.name
			)
		);
	});

	const s = createEl(
		'select',
		{ name },
		minifiedOptions
	);

	if (cb) s.addEventListener('change', e => cb(e.target.value));
	return s;
}

const loadLangSwitcher = () => {
	source_select = createSwitcher(source_lang, 'source_lang', supportedLanguages, updateSourceLang);
	target_select = createSwitcher(target_lang, 'target_lang', supportedLanguages, updateTargetLang);

	const switcher = createEl(
		'button',
		{ class: 'btn' },
		textToHtml(`<svg width="24px" height="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" color="rgb(200, 200, 200)"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 120l48 48-48 48"/><path d="M352 168H144a80.24 80.24 0 00-80 80v16M192 392l-48-48 48-48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M160 344h208a80.24 80.24 0 0080-80v-16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`)
	);
	switcher.addEventListener('click', switchBetweenLangs);

	wrapper.append(
		createEl(
			'div',
			{
				class: 'switcher flex'
			},
			[source_select, switcher, target_select]
		)
	)
}

const handleLanInLs = (key, defaultLang) => {
	const value = localStorage.getItem(key);

	if (!value) localStorage.setItem(key, defaultLang);
	else {
		const findLang = supportedLanguages.find(lang => lang.id === value);

		// If not valid lang
		if (!findLang) localStorage.setItem(key, defaultLang);
	}

	return localStorage.getItem(key);
}

const handleError = (e) => {
	console.error(e);
}

const onInputChange = () => {
	input = target_input.value;

	if (debounce) clearTimeout(debounce);
	debounce = setTimeout(translateSnapshot, DEBOUNCE_TIME);
}

const translateSnapshot = () => {
	if (input.length === 0) source_input.value = TEXT_GROUP.TargetInputPlaceholder;
	else {
		translate(input).then(data => {
			source_input.value = data.TranslatedText;
		})
	}
}

const switchBetweenLangs = () => {
	try {
		// Find indexes
		const targetIndex = supportedLanguages.findIndex(lang => lang.id === target_lang);
		const sourceIndex = supportedLanguages.findIndex(lang => lang.id === source_lang);

		if (!targetIndex || !sourceIndex) throw new Error("The desired language not found");

		// Get languages
		const targetOld = target_lang;
		const sourceOld = source_lang;

		// Update target lang
		source_select.selectedIndex = targetIndex;
		updateTargetLang(sourceOld);

		// Update source lang
		target_select.selectedIndex = sourceIndex;
		updateSourceLang(targetOld);
	} catch (e) {
		console.error(e.message);
	}
}

/* Update methods */
const updateSourceLang = lang => {
	source_lang = lang;
	if (String(source_input.value).length > 0) {
		translate(source_input.value, lang).then(data => {
			target_input.value = data.TranslatedText;
		});
	}

	localStorage.setItem('source-lang', source_lang);
	alignByLang(target_input, source_lang);
}

const updateTargetLang = lang => {
	target_lang = lang;
	if (String(target_input.value).length > 0) {
		translate(target_input.value, lang).then(data => {
			source_input.value = data.TranslatedText;
		});
	}

	localStorage.setItem('target-lang', target_lang);
	alignByLang(source_input, target_lang);
}

/* Translate */
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
					if (data) done(data);
					else {
						handleError(e);
						reject(e);
					}
				}
			);
		})
	} catch (e) {
		handleError(e);
	}
}

document.addEventListener('DOMContentLoaded', init);