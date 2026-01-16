/**
 * Datos estáticos del Overlay de Chat de Twitch
 * Equipos de F1, asignaciones de usuarios y números
 */

// Definición de equipos de F1
const teams = {
    mercedes: {
        color: '#00D2BE',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1742785431/Mercedes-Logo.svg_obpxws.png',
        width: '1.6em'
    },
    ferrari: {
        color: '#DC0000',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1742785952/Ferrari-Logo_l17w2e.png',
        width: '1.6em'
    },
    redBull: {
        id: 'red bull',
        color: '#1E41FF',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1742786100/rb_x5pwuu.png',
        width: '1.6em'
    },
    alpine: {
        color: '#0090FF',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1742786254/imgbin_alpine-a110-sports-car-renault-png_upq6ni.png',
        width: '1.6em'
    },
    astonmartin: {
        color: '#229971',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1745062238/am_pwkxij.png',
        width: '1.6em'
    },
    alfaRomeo: {
        color: '#c65151ff',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1742786780/20210106191506_Alfa_Romeo_Racing__Logo_fly4r8.svg',
        width: '1.6em'
    },
    toroRosso: {
        color: '#4d4fceff',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1742786903/racing_bulls-logo_brandlogos.net_bjuef_ygq2em.png',
        width: '1.6em'
    },
    haas: {
        color: '#d4aa47ff',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1745828985/Logo_Haas_F1_vekjlj.png',
        width: '1.6em'
    },
    mclaren: {
        color: '#FF8700',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1745062373/9807_McLaren_Logo_cqwdty.png',
        width: '1.6em'
    },
    williams: {
        color: '#FFFFFF',
        logo: 'https://res.cloudinary.com/pcsolucion/image/upload/v1745829856/clipart3162470_uki0pk.png',
        width: '1.5em'
    }
};

// Asignación de números de piloto por usuario
const userNumbers = {
    'takeru_xiii': 1, 'james_193': 2, 'ractor09': 3, 'xroockk': 4, 'broxa24': 5,
    'x1lenz': 6, 'darkous666': 7, 'manguerazo': 8, 'c_h_a_n_d_a_l_f': 9, 'ccxsnop': 10,
    'macusam': 11, 'urimas82': 12, 'nanusso': 13, 'bitterbitz': 14, 'reichskanz': 15,
    'mambiitv': 16, 'yisus86': 17, 'tonyforyu': 18, 'emma1403': 19, 'fabirules': 20,
    'panicshow_12': 21, 'ifleky': 22, 'xxchusmiflowxx': 23, 'dmaster__io': 24, 'icarolinagi': 25,
    'damakimera': 26, 'moradorpep': 27, 'franciscodock': 28, 'juanka6668': 29, 'coerezil': 30,
    'reeckone': 31, 'akanas_': 32, 'vannhackez': 33, 'mithands': 34, 'annacardo': 35,
    'repxok': 36, 'sblazzin': 37, 'xioker': 38, 'k0nrad_es': 39, 'mcguarru': 40,
    'jookerlan': 41, 'n0cturne84': 42, 'n1tramix': 43, 'scotlane': 44, 'albertplayxd': 45,
    'linabraun': 46, 'olokaustho': 47, 'srtapinguino': 48, 'selenagomas_': 49, 'srgato_117': 50,
    'skodi': 51, 'duckcris': 52, 'kunfuu': 53, '01jenial': 54, 'pishadekai78': 55,
    'azu_nai': 56, 'th3chukybar0': 57, 'srroses': 58, 'redenil': 59, 'sergiosc_games': 60,
    'jramber': 61, 'zayavioleta': 62, '0necrodancer0': 63, 'miguela1982': 64, 'grom_xl': 65,
    'mxmktm': 66, 'scorgaming': 67, 'narakx': 68, 'cintramillencolin': 69, 'fali_': 70,
    'melereh': 71, 'n4ch0g': 72, 'lingsh4n': 73, 'sylarxd': 74, 'jenial01': 75,
    'inmaculadaconce': 76, 'an1st0pme': 77, 'yllardelien': 78, 'botrixoficial': 79, 'extreme87r': 80,
    'rodrigo24714': 81, 'trujill04': 82, 'badulak3': 83, 'sueir0': 84, 'adrivknj': 85,
    'raulmilara79': 86, 'zeussar999': 87, 'divazzi108': 88, 'madgaia_': 89, 'buu_ky': 90,
    'siilord': 91, 'aitorgp91': 92, 'mrkemm': 93, 'pesteavinno': 94, 'belmont_z': 95,
    'toxod': 96, 'damnbearlord': 97, 'wiismii': 98, 'c4n4rion': 99, 'liiukiin': 100
};

// Asignación de equipos por usuario
const userTeams = {
    'takeru_xiii': 'mercedes',
    'james_193': 'mercedes',
    'ractor09': 'mclaren',
    'xroockk': 'toroRosso',
    'broxa24': 'ferrari',
    'x1lenz': 'redBull',
    'darkous666': 'ferrari',
    'manguerazo': 'redBull',
    'c_h_a_n_d_a_l_f': 'alpine',
    'ccxsnop': 'mclaren',
    'macusam': 'astonmartin',
    'urimas82': 'astonmartin',
    'nanusso': 'toroRosso',
    'bitterbitz': 'williams',
    'reichskanz': 'alpine',
    'mambiitv': 'alfaRomeo',
    'yisus86': 'williams',
    'tonyforyu': 'williams',
    'emma1403': 'alfaRomeo',
    'fabirules': 'haas',
    'panicshow_12': 'haas',
    'ifleky': 'haas'
};

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { teams, userNumbers, userTeams };
}
