// Translations for Uzbek, Russian, English
export type Language = 'uz' | 'ru' | 'en';

const translations: Record<string, Record<Language, string>> = {
  // Common
  'app.name': { uz: 'Goldride', ru: 'Goldride', en: 'Goldride' },
  'common.next': { uz: 'Keyingi', ru: 'Далее', en: 'Next' },
  'common.back': { uz: 'Orqaga', ru: 'Назад', en: 'Back' },
  'common.cancel': { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  'common.confirm': { uz: 'Tasdiqlash', ru: 'Подтвердить', en: 'Confirm' },
  'common.save': { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
  'common.loading': { uz: 'Yuklanmoqda...', ru: 'Загрузка...', en: 'Loading...' },
  'common.error': { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
  'common.success': { uz: 'Muvaffaqiyatli', ru: 'Успешно', en: 'Success' },
  'common.coming_soon': { uz: 'Tez kunda...', ru: 'Скоро...', en: 'Coming soon...' },
  'common.currency': { uz: "so'm", ru: 'сум', en: 'UZS' },

  // Welcome
  'welcome.title': { uz: 'Xush kelibsiz!', ru: 'Добро пожаловать!', en: 'Welcome!' },
  'welcome.subtitle': { 
    uz: "Premium va tezkor taksi xizmati", 
    ru: 'Премиальное и быстрое такси', 
    en: 'Premium & fast taxi service' 
  },
  'welcome.start': { uz: 'Boshlash', ru: 'Начать', en: 'Get Started' },
  'welcome.lang_select': { uz: 'Tilni tanlang', ru: 'Выберите язык', en: 'Select Language' },

  // Auth
  'auth.phone_title': { uz: 'Telefon raqamingiz', ru: 'Ваш номер телефона', en: 'Your Phone Number' },
  'auth.phone_subtitle': { 
    uz: 'Kirish uchun telefon raqamingizni kiriting', 
    ru: 'Введите номер телефона для входа', 
    en: 'Enter your phone number to login' 
  },
  'auth.phone_placeholder': { uz: '+998 90 123 45 67', ru: '+998 90 123 45 67', en: '+998 90 123 45 67' },
  'auth.send_code': { uz: 'Davom etish', ru: 'Продолжить', en: 'Continue' },
  'auth.otp_title': { uz: 'Kodni kiriting', ru: 'Введите код', en: 'Enter Code' },
  'auth.otp_subtitle': { 
    uz: 'raqamiga yuborilgan kodni kiriting', 
    ru: 'Введите код, отправленный на', 
    en: 'Enter the code sent to' 
  },
  'auth.resend': { uz: 'Qayta yuborish', ru: 'Отправить снова', en: 'Resend' },
  'auth.verify': { uz: 'Tasdiqlash', ru: 'Подтвердить', en: 'Verify' },

  // Role selection
  'role.title': { uz: 'Siz kimsiz?', ru: 'Кто вы?', en: 'Who are you?' },
  'role.passenger': { uz: "Yo'lovchi", ru: 'Пассажир', en: 'Passenger' },
  'role.passenger_desc': { 
    uz: "Taksi chaqirish va yo'l yurish", 
    ru: 'Вы вызвать такси и ехать', 
    en: 'Call a taxi and ride' 
  },
  'role.driver': { uz: 'Haydovchi', ru: 'Водитель', en: 'Driver' },
  'role.driver_desc': { 
    uz: "Taksi haydash va pul ishlash", 
    ru: 'Водить такси и зарабатывать', 
    en: 'Drive a taxi and earn money' 
  },

  // Registration
  'reg.name_title': { uz: "Ma'lumotlaringiz", ru: 'Ваши данные', en: 'Your Details' },
  'reg.first_name': { uz: 'Ism', ru: 'Имя', en: 'First Name' },
  'reg.last_name': { uz: 'Familiya', ru: 'Фамилия', en: 'Last Name' },
  'reg.photo': { uz: 'Rasm qo\'yish', ru: 'Добавить фото', en: 'Add Photo' },

  // Driver registration
  'dreg.title': { uz: 'Haydovchi ma\'lumotlari', ru: 'Данные водителя', en: 'Driver Details' },
  'dreg.license': { uz: 'Guvohnoma raqami', ru: 'Номер удостоверения', en: 'License Number' },
  'dreg.car_title': { uz: 'Mashina ma\'lumotlari', ru: 'Данные автомобиля', en: 'Vehicle Details' },
  'dreg.make': { uz: 'Marka', ru: 'Марка', en: 'Make' },
  'dreg.model': { uz: 'Model', ru: 'Модель', en: 'Model' },
  'dreg.year': { uz: 'Yil', ru: 'Год', en: 'Year' },
  'dreg.color': { uz: 'Rang', ru: 'Цвет', en: 'Color' },
  'dreg.plate': { uz: 'Davlat raqami', ru: 'Гос. номер', en: 'Plate Number' },
  'dreg.type': { uz: 'Mashina turi', ru: 'Тип авто', en: 'Vehicle Type' },
  'dreg.submit': { uz: "Ro'yxatdan o'tish", ru: 'Зарегистрироваться', en: 'Register' },

  // Passenger home
  'home.where_to': { uz: 'Qayerga borasiz?', ru: 'Куда поедете?', en: 'Where to?' },
  'home.pickup': { uz: 'Chiqish nuqtasi', ru: 'Место посадки', en: 'Pickup point' },
  'home.destination': { uz: 'Manzil', ru: 'Место назначения', en: 'Destination' },
  'home.shared_ride': { uz: 'Sherikli safar', ru: 'Совместная поездка', en: 'Shared Ride' },
  'home.regular_ride': { uz: 'Oddiy safar', ru: 'Обычная поездка', en: 'Regular Ride' },
  'home.solo': { uz: 'Yolg\'iz (Solo)', ru: 'Один (Solo)', en: 'Solo' },
  'home.shared_1': { uz: 'Sherikli (1+)', ru: 'Совместно (1+)', en: 'Shared (1+)' },
  'home.shared_2': { uz: 'Sherikli (2+)', ru: 'Совместно (2+)', en: 'Shared (2+)' },
  'home.discount': { uz: '{n}% chegirma', ru: 'скидка {n}%', en: '{n}% discount' },
  'home.estimate': { uz: 'Narxni hisoblash', ru: 'Рассчитать стоимость', en: 'Get Estimate' },
  'home.request': { uz: 'Taksi chaqirish', ru: 'Вы вызвать такси', en: 'Request Ride' },

  // Ride status
  'ride.searching': { uz: 'Haydovchi qidirilmoqda...', ru: 'Поиск водителя...', en: 'Searching for driver...' },
  'ride.driver_found': { uz: 'Haydovchi topildi!', ru: 'Водитель найден!', en: 'Driver found!' },
  'ride.on_the_way': { uz: "Haydovchi yo'lda", ru: 'Водитель в пути', en: 'Driver on the way' },
  'ride.arrived': { uz: 'Haydovchi yetib keldi', ru: 'Водитель прибыл', en: 'Driver arrived' },
  'ride.arrived_message': { 
    uz: 'Haydovchi yetib keldi. 2 minutdan keyin kutish narxi (har minutga 500 so\'m) qo\'shiladi.', 
    ru: 'Водитель прибыл. Через 2 минуты начнет начисляться плата за ожидание (500 сум/мин).', 
    en: 'Driver arrived. Waiting fee (500 UZS/min) will apply after 2 minutes.' 
  },
  'ride.started': { uz: 'Safar boshlandi', ru: 'Поездка началась', en: 'Ride started' },
  'ride.completed': { uz: 'Safar tugadi. Rahmat!', ru: 'Поездка завершена. Спасибо!', en: 'Ride completed. Thank you!' },
  'ride.cancelled': { uz: 'Bekor qilindi', ru: 'Отменено', en: 'Cancelled' },
  'ride.cancel_ride': { uz: 'Safarni bekor qilish', ru: 'Отменить поездку', en: 'Cancel Ride' },
  'ride.shared_discount': { uz: "Sherikli chegirma", ru: 'Скидка за совместную', en: 'Shared discount' },

  // Driver
  'driver.online': { uz: 'Onlayn', ru: 'Онлайн', en: 'Online' },
  'driver.offline': { uz: 'Oflayn', ru: 'Офлайн', en: 'Offline' },
  'driver.new_request': { uz: 'Yangi so\'rov!', ru: 'Новый запрос!', en: 'New request!' },
  'driver.accept': { uz: 'Qabul qilish', ru: 'Принять', en: 'Accept' },
  'driver.reject': { uz: 'Rad etish', ru: 'Отклонить', en: 'Reject' },
  'driver.navigate': { uz: "Yo'l ko'rsatish", ru: 'Навигация', en: 'Navigate' },
  'driver.pickup_passenger': { uz: "Yo'lovchini olish", ru: 'Забрать пассажира', en: 'Pickup Passenger' },
  'driver.start_work': { uz: 'Ishni boshlash', ru: 'Начать работу', en: 'Start Work' },
  'driver.end_work': { uz: 'Ishni tugatish', ru: 'Завершить работу', en: 'End Work' },
  'driver.gps_required': { uz: 'Joylashuvni aniqlash (GPS) yoqilishi shart!', ru: 'Требуется включить GPS!', en: 'GPS must be enabled!' },
  'driver.start_ride': { uz: 'Safarni boshlash', ru: 'Начать поездку', en: 'Start Ride' },
  'driver.complete_ride': { uz: 'Safarni yakunlash', ru: 'Завершить поездку', en: 'Complete Ride' },
  'driver.earnings': { uz: 'Daromad', ru: 'Заработок', en: 'Earnings' },
  'driver.total_rides': { uz: 'Jami safarlar', ru: 'Всего поездок', en: 'Total Rides' },
  'driver.commission': { uz: 'Komissiya (5%)', ru: 'Комиссия (5%)', en: 'Commission (5%)' },
  'driver.waiting_approval': { uz: 'Tasdiqlash kutilmoqda', ru: 'Ожидает подтверждения', en: 'Awaiting Approval' },
  'driver.recommendation_title': { uz: 'Aqlli Tavsiya', ru: 'Умная Рекомендация', en: 'Smart Recommendation' },
  'driver.recommendation_bonus': { uz: 'Taxminiy bonus: +{amount} UZS', ru: 'Примерный бонус: +{amount} сум', en: 'Estimated bonus: +{amount} UZS' },
  'driver.recommendation_reason': { uz: 'Ushbu hududda buyurtmalar soni ortib bormoqda.', ru: 'В этом районе растет количество заказов.', en: 'Demand is increasing in this area.' },
  'driver.view_route': { uz: 'Yo\'nalishni ko\'rish', ru: 'Посмотреть маршрут', en: 'View Route' },
  'driver.mark_arrived': { uz: 'Yetib keldim', ru: 'Я прибыл', en: 'I have arrived' },

  // Profile
  'profile.title': { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
  'profile.edit': { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
  'profile.history': { uz: 'Safarlar tarixi', ru: 'История поездок', en: 'Ride History' },
  'profile.payments': { uz: "To'lovlar", ru: 'Платежи', en: 'Payments' },
  'profile.promos': { uz: 'Promokodlar', ru: 'Промокоды', en: 'Promocodes' },
  'profile.language': { uz: 'Til', ru: 'Язык', en: 'Language' },
  'profile.logout': { uz: 'Chiqish', ru: 'Выйти', en: 'Logout' },
  'profile.guest': { uz: 'Mehmon', ru: 'Гость', en: 'Guest' },
  'profile.login_to_view': { uz: 'Profilga kiring', ru: 'Войдите в профиль', en: 'Login to view profile' },
  'profile.login_signup': { uz: 'Tizimga kirish / Ro\'yxatdan o\'tish', ru: 'Войти / Зарегистрироваться', en: 'Login / Sign Up' },
  'profile.become_driver': { uz: 'Haydovchi bo\'lish', ru: 'Стать водителем', en: 'Become a Driver' },
  'profile.earn_with_us': { uz: 'Biz bilan ishlab pul toping', ru: 'Зарабатывайте с нами', en: 'Earn with us' },
  'profile.help': { uz: 'Yordam', ru: 'Помощь', en: 'Help' },

  // Rating
  'rating.title': { uz: "Safarni baholang", ru: 'Оцените поездку', en: 'Rate Your Ride' },
  'rating.comment': { uz: 'Izoh qoldiring', ru: 'Оставьте комментарий', en: 'Leave a comment' },
  'rating.submit': { uz: 'Baholash', ru: 'Оценить', en: 'Rate' },

  // Wallet
  'wallet.title': { uz: 'Hamyon', ru: 'Кошелёк', en: 'Wallet' },
  'wallet.available_balance': { uz: 'Mavjud balans', ru: 'Доступный баланс', en: 'Available Balance' },
  'wallet.gold_points': { uz: 'GoldPoints', ru: 'GoldPoints', en: 'GoldPoints' },
  'wallet.points_hint': { uz: 'Har bir safar uchun bonus ballar', ru: 'Бонусные баллы за поездки', en: 'Bonus points for every ride' },
  'wallet.topup': { uz: 'To\'ldirish', ru: 'Пополнить', en: 'Top Up' },
  'wallet.withdraw': { uz: 'Yechib olish', ru: 'Вывести', en: 'Withdraw' },
  'wallet.stats': { uz: 'Statistika', ru: 'Статистика', en: 'Statistics' },
  'wallet.total_earned': { uz: 'Jami daromad', ru: 'Всего заработано', en: 'Total Earned' },
  'wallet.total_withdrawn': { uz: 'Jami yechilgan', ru: 'Всего выведено', en: 'Total Withdrawn' },
  'wallet.commission': { uz: 'Komissiya', ru: 'Комиссия', en: 'Commission' },
  'wallet.transactions': { uz: 'Tranzaksiyalar', ru: 'Транзакции', en: 'Transactions' },
  'wallet.pending': { uz: 'Kutilmoqda', ru: 'В ожидании', en: 'Pending' },
  'wallet.history_empty': { uz: 'Tranzaksiyalar topilmadi', ru: 'Транзакции не найдены', en: 'No transactions found' },
  'wallet.withdraw_min': { uz: 'Minimal yechib olish summasi 10,000 UZS', ru: 'Минимальная сумма вывода 10,000 сум', en: 'Minimum withdrawal 10,000 UZS' },
  'wallet.topup_min': { uz: 'Minimal to\'ldirish summasi 5,000 UZS', ru: 'Минимальная сумма пополнения 5,000 сум', en: 'Minimum top up 5,000 UZS' },
  'wallet.insufficient_balance': { uz: 'Balansingizda yetarli mablag\' yo\'q', ru: 'Недостаточно средств на балансе', en: 'Insufficient balance' },
  'wallet.invalid_card': { uz: 'To\'g\'ri karta raqamini kiriting', ru: 'Введите корректный номер карты', en: 'Enter a valid card number' },
  'wallet.confirm_withdraw': { uz: '{amount} UZS yechib olishni tasdiqlaysizmi?\n\nKarta: **** {card}', ru: 'Подтвердите вывод {amount} сум?\n\nКарта: **** {card}', en: 'Confirm withdrawal of {amount} UZS?\n\nCard: **** {card}' },
  'wallet.confirm_topup': { uz: '{amount} UZS to\'ldirishni tasdiqlaysizmi?\n\nKarta: **** {card}', ru: 'Подтвердите пополнение {amount} сум?\n\nКарта: **** {card}', en: 'Confirm top up of {amount} UZS?\n\nCard: **** {card}' },
  'wallet.withdraw_success': { uz: '{amount} UZS yechib olish so\'rovi yuborildi. 1-24 soat ichida kartangizga tushadi.', ru: 'Запрос на вывод {amount} сум отправлен. Зачисление в течение 1-24 часов.', en: 'Withdrawal request for {amount} UZS sent. It will reflect in 1-24 hours.' },
  'wallet.topup_success': { uz: 'Hamyoningiz {amount} UZS ga to\'ldirildi!', ru: 'Кошелёк пополнен на {amount} сум!', en: 'Wallet topped up by {amount} UZS!' },
  'wallet.ride_num': { uz: 'Safar #{id}', ru: 'Поездка #{id}', en: 'Ride #{id}' },
  'wallet.ride_desc': { uz: 'Safar #{id} — {count} yo\'lovchi', ru: 'Поездка #{id} — {count} пасс.', en: 'Ride #{id} — {count} pass.' },
  'wallet.card_withdraw': { uz: 'Kartaga yechib olish', ru: 'Вывод на карту', en: 'Withdraw to card' },
  'wallet.card_topup': { uz: 'Karta orqali to\'ldirish', ru: 'Пополнение картой', en: 'Card top up' },
  'wallet.humo_topup': { uz: 'Humo karta orqali to\'ldirish', ru: 'Пополнение через Humo', en: 'Humo card top up' },
  'wallet.uzcard_topup': { uz: 'UzCard karta orqali to\'ldirish', ru: 'Пополнение через UzCard', en: 'UzCard card top up' },
  'wallet.all_transactions': { uz: 'Barchasi', ru: 'Все', en: 'All' },
  'wallet.transaction': { uz: 'Tranzaksiya', ru: 'Транзакция', en: 'Transaction' },
  'wallet.earnings': { uz: 'Daromad', ru: 'Доход', en: 'Earnings' },
  'wallet.payment': { uz: 'To\'lov', ru: 'Оплата', en: 'Payment' },
  'wallet.refund': { uz: 'Qaytarish', ru: 'Возврат', en: 'Refund' },
  'wallet.total_topup': { uz: 'Jami to\'ldirilgan', ru: 'Всего пополнено', en: 'Total Top Up' },
  'wallet.for_rides': { uz: 'Safarlar uchun', ru: 'За поездки', en: 'For rides' },
  'wallet.auto_pay_info': { uz: 'Safar buyurtma qilganda hamyon balansidan avtomatik to\'lanadi', ru: 'При заказе поездки оплата спишется автоматически', en: 'Ride payments are automatically deducted from wallet' },
  'wallet.card_number': { uz: 'Karta raqami', ru: 'Номер карты', en: 'Card Number' },
  'wallet.card_type': { uz: 'Karta turi', ru: 'Тип карты', en: 'Card Type' },
  'wallet.card_hint': { uz: 'Humo yoki UzCard kartasi raqamini kiriting', ru: 'Введите номер карты Humo или UzCard', en: 'Enter Humo or UzCard number' },
  'wallet.amount_uzs': { uz: 'Summa (UZS)', ru: 'Сумма (сум)', en: 'Amount (UZS)' },
  'wallet.filter_count': { uz: '{count} ta', ru: '{count} шт.', en: '{count} items' },

  // Time
  'time.now': { uz: 'Hozirgina', ru: 'Только что', en: 'Just now' },
  'time.hours_ago': { uz: '{n} soat oldin', ru: '{n} ч. назад', en: '{n}h ago' },
  'time.yesterday': { uz: 'Kecha', ru: 'Вчера', en: 'Yesterday' },
  'time.days_ago': { uz: '{n} kun oldin', ru: '{n} дн. назад', en: '{n}d ago' },

  // Settings
  'settings.title': { uz: 'Sozlamalar', ru: 'Настройки', en: 'Settings' },
  'settings.first_name_required': { uz: 'Ism kiritilishi shart', ru: 'Имя обязательно', en: 'First name is required' },
  'settings.update_success': { uz: 'Profil ma\'lumotlari yangilandi', ru: 'Данные профиля обновлены', en: 'Profile updated' },
  'settings.update_error': { uz: 'Ma\'lumotlarni saqlashda xatolik yuz berdi', ru: 'Ошибка при сохранении данных', en: 'Error saving data' },
  'settings.enter_first_name': { uz: 'Ismingizni kiriting', ru: 'Введите имя', en: 'Enter your first name' },
  'settings.enter_last_name': { uz: 'Familiyangizni kiriting', ru: 'Введите фамилию', en: 'Enter your last name' },
  'settings.phone_readonly': { uz: 'Telefon raqamini o\'zgartirib bo\'lmaydi', ru: 'Номер телефона нельзя изменить', en: 'Phone number cannot be changed' },
  'settings.login_required': { uz: 'Iltimos, avval tizimga kiring', ru: 'Пожалуйста, сначала войдите', en: 'Please login first' },
  'settings.logout_confirm': { uz: 'Chiqishni xohlaysizmi?', ru: 'Вы действительно хотите выйти?', en: 'Do you want to logout?' },
};

let currentLanguage: Language = 'uz';

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
};

export const getLanguage = (): Language => currentLanguage;

export const t = (key: string, params?: Record<string, string | number>): string => {
  const entry = translations[key];
  if (!entry) return key;
  let text = entry[currentLanguage] || entry['uz'] || key;
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    });
  }
  
  return text;
};

export default translations;
