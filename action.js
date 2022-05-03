const request = require('sync-request');

module.exports = {

	/**
	 * Основная функция.
	 * Находит контакт в AmoCRM по почте или телефону.
	 * Если находит - обновляет данные, в ином случае - создаёт контакт.
	 * После чего создаёт сделку с этим контактом.
	 * @param  {Object} data
	 * @return {String}      error or ''
	 */
	call: function(data){
		data.first_name = data.name.substring(0, data.name.lastIndexOf(' ')).trim();
		data.last_name = data.name.substring(data.name.lastIndexOf(' ')).trim();

		if(!data.first_name) return 'Не указано имя';
		if(!data.last_name) return 'Не указана фамилия';
		if(!data.email) return 'Не указан Email';
		if(!data.phone) return 'Не указан номер телефона';
		if(/^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/.test(data.email) == false) return 'Некорректный Email';
		if(/^[0-9]{11}$/.test(data.phone) == false) return 'Некорректный номер телефона';

		let contact = this.findContact(data.email);
		if(!contact) contact = this.findContact(data.phone);

		contact = contact
			? this.updateContact(contact, data)
			: this.createContact(data);

		this.createLeads(contact);

		return '';

	},

	/**
	 * Поиск контакта в AmoCRM
	 * @param  {String} query Искомая строка
	 * @return {Object}       Объект контакта
	 */
	findContact: function(query){
		const params = new URLSearchParams({ limit: 1, query: query });
		try {
			const res = request('GET', 'https://ruslan2804y.amocrm.ru/api/v4/contacts?' + params.toString(), {
				headers: { 'Authorization': auth.getToken() }
			});

			return JSON.parse(res.getBody('utf8'))._embedded.contacts[0];
		}catch(e){

		}
	},

	/**
	 * Получение контакта по ID (не используется)
	 * @param  {Number} id ID контакта
	 * @return {Object}    Объект контакта
	 */
	getContact: function(id){
		try {
			const res = request('GET', 'https://ruslan2804y.amocrm.ru/api/v4/contacts/' + id, {
				headers: { 'Authorization': auth.getToken() }
			});

			return JSON.parse(res.getBody('utf8'));
		}catch(e){

		}
	},

	/**
	 * Обновление контакта. Обновляет только новые данные.
	 * Не отправляет запрос, если данные не изменились
	 * @param  {Object} contact Объект контакта
	 * @param  {Object} data    Новые данные
	 * @return {Number}         ID контакта
	 */
	updateContact: function(contact, data){
		let updated = false;
		let updatedData = {};

		if(data.name != contact.name){
			updatedData.first_name = data.first_name;
			updatedData.last_name = data.last_name;
			updated = true;
		}

		let fields = { phone: 'PHONE', email: 'EMAIL' };
		let custom_fields_values = [];
		for(const field of contact.custom_fields_values){
			for(const f in fields){

				if(fields[f] && field.field_code == fields[f]){
					custom_fields_values.push({
						field_id: field.field_id,
						values: [{ value: data[f], enum_id: field.values[0].enum_id }]
					});
					fields[f] = false;
				}

			}
		}

		if(custom_fields_values.length){
			updatedData.custom_fields_values = custom_fields_values;
			updated = true;
		}

		if(!updated){
			request('PATCH', 'https://ruslan2804y.amocrm.ru/api/v4/contacts/' + contact.id, {
				headers: { 'Authorization': auth.getToken() },
				json: updatedData
			});
		}

		return contact.id;
	},

	/**
	 * Создание контакта
	 * @param  {Object} data Новые данные
	 * @return {Number}      ID контакта
	 */
	createContact: function(data){
		let res = request('POST', 'https://ruslan2804y.amocrm.ru/api/v4/contacts', {
			headers: { 'Authorization': auth.getToken() },
			json: [{
				first_name: data.first_name,
				last_name: data.last_name,
				custom_fields_values: [
					{
						field_name: 'Телефон',
						field_code: 'PHONE',
						field_type: 'multitext',
						values: [{ value: data.phone, enum_code: "WORK" }]
					},
					{
						field_name: 'Email',
						field_code: 'EMAIL',
						field_type: 'multitext',
						values: [{ value: data.email, enum_code: "WORK" }]
					}
				]
			}]
		});

		res = JSON.parse(res.getBody('utf8'));

		return res._embedded.contacts[0].id;
	},

	/**
	 * Создание сделки
	 * @param {Number} contactId ID контакта
	 */
	createLeads: function(contactId){
		request('POST', 'https://ruslan2804y.amocrm.ru/api/v4/leads', {
			headers: { 'Authorization': auth.getToken() },
			json: [{
				_embedded: {
					contacts: [
						{ id: contactId }
					]
				}
			}]
		});
	}

}
