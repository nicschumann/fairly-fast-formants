export interface AudioFileHandle {
    filepath : string,
    name: string,
    short: string,
};

export const test_data = {
    'uh-fu': {filepath: '/test/uh-fu.wav', name: 'Upper High, Front Unrounded'},
    'lh-fu': {filepath: '/test/lh-fu.wav', name: 'Lower High, Front Unrounded'},
    'um-fu': {filepath: '/test/um-fu.wav', name: 'Upper Mid, Front Unrounded'},
    'lm-fu': {filepath: '/test/lm-fu.wav', name: 'Lower Mid, Front Unrounded'},
    'ul-fu': {filepath: '/test/ul-fu.wav', name: 'Upper Low, Front Unrounded'},
    'll-fu': {filepath: '/test/ll-fu.wav', name: 'Lower Low, Front Unrounded'},

    'uh-fr': {filepath: '/test/uh-fr.wav', name: 'Upper High, Front Rounded'},
    'lh-fr': {filepath: '/test/lh-fr.wav', name: 'Lower High, Front Rounded'},
    'um-fr': {filepath: '/test/um-fr.wav', name: 'Upper Mid, Front Rounded'},
    'lm-fr': {filepath: '/test/lm-fr.wav', name: 'Lower Mid, Front Rounded'},
    'll-fr': {filepath: '/test/ll-fr.wav', name: 'Lower Low, Front Rounded'},

    'uh-cu': {filepath: '/test/uh-cu.wav', name: 'Upper High, Center Unrounded'},
    'um-cu': {filepath: '/test/um-cu.wav', name: 'Upper Mid, Center Unrounded'},
    'lm-cu': {filepath: '/test/lm-cu.wav', name: 'Lower Mid, Center Unrounded'},
    'ul-cu': {filepath: '/test/lh-cu.wav', name: 'Upper Low, Center Unrounded'},
    'll-cu': {filepath: '/test/ll-cu.wav', name: 'Lower Low, Center Unrounded'},

    'uh-cr': {filepath: '/test/uh-cr.wav', name: 'Upper High, Front Rounded'},
    'um-cr': {filepath: '/test/um-cr.wav', name: 'Upper Mid, Front Rounded'},
    'lm-cr': {filepath: '/test/lm-cr.wav', name: 'Lower Mid, Front Rounded'},

    'uh-bu': {filepath: '/test/uh-bu.wav', name: 'Upper High, Back Unrounded'},
    'um-bu': {filepath: '/test/um-bu.wav', name: 'Upper Mid, Back Unrounded'},
    'lm-bu': {filepath: '/test/lm-bu.wav', name: 'Lower Mid, Back Unrounded'},
    'll-bu': {filepath: '/test/ll-bu.wav', name: 'Lower Low, Back Unrounded'},

    'uh-br': {filepath: '/test/uh-br.wav', name: 'Upper High, Back Rounded'},
    'lh-br': {filepath: '/test/lh-br.wav', name: 'Lower High, Back Rounded'},
    'um-br': {filepath: '/test/um-br.wav', name: 'Upper Mid, Back Rounded'},
    'lm-br': {filepath: '/test/lm-br.wav', name: 'Lower Mid, Back Rounded'},
    'll-br': {filepath: '/test/ll-br.wav', name: 'Lower Low, Back Rounded'},

    'nic': {filepath: '/test/nic-ah.m4a', name: 'Nic\'s Recording'},
};