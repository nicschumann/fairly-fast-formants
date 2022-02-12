export interface AudioFileHandle {
    filepath : string,
    name: string,
    short: string,
};

export const test_data = {
    'uh-fu': {filepath: '/test/uh-fu.wav', name: 'Upper High, Front Unrounded'},
    'lh-fu': {filepath: '/test/lh-fu.wav', name: 'Lower High, Front Unrounded'},
};