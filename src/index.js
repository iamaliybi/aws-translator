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
	TargetInputPlaceholder: 'Translate',
	TargetInputTranslating: 'Translating...',
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

	loadLangSwitcher();
}

const loadAlignClasses = (lang) => {
	const isRtl = langIsRtl(lang);
	return `text-${isRtl ? 'r' : 'l'} dir-${isRtl ? 'rtl' : 'ltr'}`;
}

const loadSource = () => {
	source_el = createEl('textarea', {
		placeholder: TEXT_GROUP.TargetInputPlaceholder,
		class: loadAlignClasses(target_lang),
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
	target_el = createEl('textarea', {
		class: loadAlignClasses(source_lang),
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
	const sc = createSwitcher(source_lang, 'source_lang', supportedLanguages, updateSourceLang);
	const tr = createSwitcher(target_lang, 'target_lang', supportedLanguages, updateTargetLang);

	wrapper.append(
		createEl(
			'div',
			{
				class: 'switcher flex'
			},
			[sc, tr]
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
	input = target_el.value;

	source_el.value = TEXT_GROUP.TargetInputTranslating;

	if (debounce) clearTimeout(debounce);
	debounce = setTimeout(translateSnapshot, DEBOUNCE_TIME);
}

const translateSnapshot = () => {
	if (input.length === 0) source_el.value = TEXT_GROUP.TargetInputPlaceholder;
	else {
		translate(input).then(data => {
			source_el.value = data.TranslatedText;
		})
	}
}

/* Update methods */
const updateSourceLang = value => {
	source_lang = value;
	if (String(source_el.value).length > 0) {
		translate(source_el.value, value).then(data => {
			target_el.value = data.TranslatedText;
		});
	}
}

const updateTargetLang = value => {
	target_lang = value;
	if (String(target_el.value).length > 0) {
		translate(target_el.value, value).then(data => {
			source_el.value = data.TranslatedText;
		});
	}
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