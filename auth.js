const fs = require('fs');
const request = require('sync-request');

module.exports = {

	/**
	 * Конфигурация приложения
	 * @type {Object}
	 */
	config: require('./config.json'),

	/**
	 * Инициализация прослушки redirect_uri
	 * @param  {express.EventEmitter} app
	 * @return {Object}
	 */
	init: function(app){

		app.get('/authorization', (req, res) => this.authorization(req, res));

		return this;

	},


	/**
	 * Функция получения токена. Если токен истёк - обновляет его перед выдачей
	 * @return {String} Bearer access токен
	 */
	getToken: function(){

		if(this.config.access_timeout - Date.now() < 10000)
			this.refresh();

		return 'Bearer ' + this.config.access_token;

	},


	/**
	 * Обмен кода авторизации на access token и refresh token
	 * @param {express.IncomingMessage} req
	 * @param {express.ServerResponse}  res
	 */
	authorization: function(req, res){
		this.send({
			client_id: this.config.client_id,
			client_secret: this.config.client_secret,
			grant_type: 'authorization_code',
			code: req.query.code,
			redirect_uri: this.config.redirect_uri
		});
	},

	/**
	 * Обновление access token
	 */
	refresh: function(){
		this.send({
			client_id: this.config.client_id,
			client_secret: this.config.client_secret,
			grant_type: 'refresh_token',
			refresh_token: this.config.refresh_token,
			redirect_uri: this.config.redirect_uri
		});
	},

	/**
	 * Функция отправки запроса на получение access token и с последующим сохранением
	 * @param  {Object} data Параметры запроса
	 */
	send: function(data){
		const res = request('POST', 'https://ruslan2804y.amocrm.ru/oauth2/access_token', {
			json: data,
		});

		this.saveToken(JSON.parse(res.getBody('utf8')));
	},

	/**
	 * Функция сохранения токена
	 * @param {Object} data
	 */
	saveToken: async function(data){
		if(!data.access_token) return console.error(data);

		this.config.access_timeout = Date.now() + data.expires_in*1000;
		this.config.access_token = data.access_token;
		this.config.refresh_token = data.refresh_token;

		fs.writeFileSync('./config.json', JSON.stringify(this.config, null, 2));
	}

}
