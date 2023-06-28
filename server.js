const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const io = socketIO(server);
app.use(express.static('public'));

// Função para obter os dados das criptomoedas
async function getCryptoList() {
  try {
    const response = await axios.get('https://br.investing.com/crypto/currencies');
    const $ = cheerio.load(response.data);

    const cryptoList = [];

    $('tbody tr').each((index, element) => {
      const name = $(element).find('.name a').text().trim();
      const symbol = $(element).find('.symb').text().trim();
      const price = $(element).find('.price a').text().trim();
      const marketCap = $(element).find('.js-market-cap').text().trim();
      const volume = $(element).find('.js-24h-volume').text().trim();
      const change = $(element).find('.js-currency-change-24h').text().trim();

      const crypto = {
        name,
        symbol,
        price,
        marketCap,
        volume,
        change,
      };

      cryptoList.push(crypto);
    });

    return cryptoList;
  } catch (error) {
    console.error(error);
    throw new Error('Ocorreu um erro na consulta.');
  }
}

// Emita os dados das criptomoedas para os clientes conectados a cada segundo
setInterval(async () => {
  try {
    const cryptoList = await getCryptoList();
    io.emit('cryptoUpdate', cryptoList);
  } catch (error) {
    console.error(error);
  }
}, 1000);

app.get('/crypto-currencies', async (req, res) => {
  try {
    const cryptoList = await getCryptoList();
    const searchQuery = req.query.search;

    if (searchQuery) {
      const filteredCryptoList = cryptoList.filter(
        crypto =>
          crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      res.render('crypto-currencies', { cryptoList: filteredCryptoList, searchQuery });
    } else {
      res.render('crypto-currencies', { cryptoList });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ocorreu um erro na consulta.' });
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
