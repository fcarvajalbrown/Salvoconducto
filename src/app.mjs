import { createWorld } from './scenario.mjs';
import { createI18n } from './i18n.mjs';
import { mount } from './ui.mjs';

const world = await createWorld();
const i18n = createI18n('en');
mount(document.getElementById('app'), { world, i18n });
