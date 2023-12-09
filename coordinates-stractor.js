async function getAllyData() {
    const endpoint = '/map/ally.txt';

    const response = await fetch(endpoint);

    const text = await response.text();

    const allys = text.split('\n');

    const result = allys.map(x => x.split(',')).map(x => ({
        id: +x[0],
        name: decodeURI(x[1]).replace(/\+/g, ' '),
        tag: x[2],
        members: +x[3],
        villages: +x[4],
        points: +x[5],
        allPoints: +x[6],
        rank: +x[7]
    }))

    return result.filter(x => typeof x.name === 'string').sort((a, b) => a.name.localeCompare(b.name));
}

async function getPlayerData() {
    const endpoint = '/map/player.txt';

    const response = await fetch(endpoint);

    const text = await response.text();

    const players = text.split('\n');

    const result = players.map(z => z.split(',')).map(x => ({
        id: +x[0],
        name: decodeURI(x[1]).replace(/\+/g, ' '),
        ally: +x[2],
        villages: +x[3],
        points: +x[4],
        rank: +x[5]
    }));

    return result.filter(x => typeof x.name === 'string').sort((a, b) => a.name.localeCompare(b.name));
}

async function getVillageData() {
    const endpoint = '/map/village.txt';

    const response = await fetch(endpoint);

    const text = await response.text();

    const villages = text.split('\n');

    const result = villages.map(z => z.split(',')).map(x => ({
        id: +x[0],
        name: x[1],
        coordinates: x[2] + '|' + x[3],
        owner: +x[4],
        points: +x[5],
        unknown: +x[6]
    }));
    
    return result.filter(x => typeof x.name === 'string').sort((a, b) => a.name.localeCompare(b.name));
}

const allyData = getAllyData();
const playerData = getPlayerData();
const villageData = getVillageData();

function distance(a, b) {
    const [x, y] = a.split('|').map(x => parseInt(x));
    const [x2, y2] = b.split('|').map(x => parseInt(x));

    return Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2));
}

function setupFilters(dialog, filters, refresh) {

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    const filterContainer = document.createElement('div');
    filterContainer.style.display = 'flex';
    filterContainer.style.flexDirection = 'column';
    filterContainer.style.gap = '10px';

    const filterAllies = document.createElement('select');
    filterAllies.placeholder = 'Tribo';
    filterAllies.multiple = true;
    filterAllies.size = 10;

    allyData.then(x => x.forEach(y => {
        filterAllies.appendChild(new Option(y.name, y.id));
    }));

    const filterPlayers = document.createElement('select');
    filterPlayers.placeholder = 'Jogador';
    filterPlayers.size = 10;
    filterPlayers.multiple = true;

    filterAllies.addEventListener('change', x => {
        const selected = Array.from(filterAllies.options).filter(x => x.selected).map(x => +x.value)

        filterPlayers.options.length = 0;

        playerData.then(x => {
            x.filter(y => selected.includes(y.ally)).forEach(y => {
                filterPlayers.appendChild(new Option(y.name, y.id));
            })
            filterPlayers.dispatchEvent(new Event('change'));
        })
    })

    playerData.then(x => {
        x.forEach(y => {
            filterPlayers.appendChild(new Option(y.name, y.id));
        })
    });

    const filterPoints = document.createElement('input');
    filterPoints.type = 'number';
    filterPoints.placeholder = 'Pontuação mínima';

    const filterCoordinatesContainer = document.createElement('div');
    filterCoordinatesContainer.style.display = 'flex';
    filterCoordinatesContainer.style.gap = '10px';

    const filterCoordinates = document.createElement('input');
    filterCoordinates.type = 'text';
    filterCoordinates.placeholder = 'Coordenadas'
    filterCoordinates.style.flex = '1';

    const filterCoordinatesDistance = document.createElement('input');
    filterCoordinatesDistance.type = 'number';
    filterCoordinatesDistance.placeholder = 'Distância máxima';
    filterCoordinatesDistance.style.flex = '1';


    filterCoordinatesContainer.append(filterCoordinates, filterCoordinatesDistance);

    let currentFilterAllies = {value: () => true}
    let currentFilterPlayers = {value: () => true}
    let currentFilterPoints = {value: () => true}
    let currentFilterCoordinates = {value: () => true}

    filters.push(currentFilterAllies);
    filters.push(currentFilterPlayers);
    filters.push(currentFilterPoints);
    filters.push(currentFilterCoordinates);

    filterAllies.addEventListener('change', async x => {
        const selected = Array.from(filterAllies.options).filter(x => x.selected).map(x => +x.value)

        const players = await playerData;

        const owners = players.filter(x => selected.includes(x.ally)).map(x => x.id);

        currentFilterAllies.value = x => selected.length === 0 || owners.includes(x.owner);

        refresh();
    })

    filterPlayers.addEventListener('change', async x => {
        const selected = Array.from(filterPlayers.options).filter(x => x.selected).map(x => +x.value)

        currentFilterPlayers.value = x => selected.length === 0 || selected.includes(x.owner);

        refresh();
    });

    filterPoints.addEventListener('input', x => {
        currentFilterPoints.value = x => filterPoints.value ? isNaN(+filterPoints.value) ? 'Pontuação mínima inválida' : x.points >= +filterPoints.value : true;

        refresh();
    });

    function filterCoordinatesChange() {
        const coordinates = filterCoordinates.value;
        const dist = filterCoordinatesDistance.value;

        if (!coordinates || !dist) {
            currentFilterCoordinates.value = x => true;
            return;
        }

        const split = coordinates.split('|').map(x => parseInt(x));

        if (split.length !== 2 || split.some(x => isNaN(x))) {
            currentFilterCoordinates.value = x => 'Coordenadas inválidas';
            return;
        }

        if (isNaN(dist)) {
            currentFilterCoordinates.value = x => 'Distância inválida';
            return;
        }

        currentFilterCoordinates.value = x => distance(x.coordinates, coordinates) <= dist;

        refresh();
    }

    filterCoordinates.addEventListener('input', filterCoordinatesChange);
    filterCoordinatesDistance.addEventListener('input', filterCoordinatesChange);

    filterContainer.append(filterAllies, filterPlayers, filterPoints, filterCoordinatesContainer);

    container.append(filterContainer);

    dialog.append(container);
}

async function main() {

    const filters = [];

    const dialog = document.createElement('dialog');

    dialog.onclose = () => {
        dialog.remove();
    };

    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.gap = '10px';
    dialog.style.backgroundColor = '#e3d5b3';
    dialog.style.padding = '1rem';
    dialog.style.overflow = 'hidden';

    document.body.append(dialog);

    const format = document.createElement('input');
    format.type = 'text';
    format.placeholder = 'Formato';
    format.value = 'id&coordenadas';
    format.style.flex = '1';

    const separator = document.createElement('input');
    separator.type = 'text';
    separator.placeholder = 'Separador';
    separator.value = ',';

    format.addEventListener('input', refresh);
    separator.addEventListener('input', refresh);

    const formatContainer = document.createElement('div');
    formatContainer.style.display = 'flex';
    formatContainer.style.gap = '10px';
    formatContainer.append(format, separator);

    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.rows = 30;

    setupFilters(dialog, filters, refresh);

    dialog.append(formatContainer);

    dialog.append(textarea);

    async function refresh0() {
        const villages = await villageData;

        let error = false;

        let result = [];

        for (const village of villages) {
            if (error) break;

            let filtered = false;

            for (const filter of filters) {
                const value = filter.value(village);

                if (typeof value === 'string') {
                    error = true;
                    textarea.value = value;
                    break;
                } else if (!value) {
                    filtered = true;
                    break;
                }
            }

            if (filtered) continue;

            result.push(village);
        }

        if (!error) {
            textarea.value = result.map(x => format.value.replace('id', x.id).replace('coordenadas', x.coordinates)).join(separator.value);
        } else {
            textarea.value = error;
        }
    }

    let timeout = null;

    async function refresh() {
        textarea.value = 'Carregando...';

        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(refresh0, 500);
    }

    dialog.showModal();
}

await main();
