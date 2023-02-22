const axios = require('axios');

async function main() {
    const result = await axios.get('https://google.com');
    if (result.err) {
    console.log('Error occured when trying to fetch');
    }
    console.log(result.data);
}

main();
