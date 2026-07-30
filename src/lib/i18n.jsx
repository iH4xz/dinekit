import React, { createContext, useContext, useState, useEffect } from 'react';

// Central i18n Translation Dictionary for DineKit
const translations = {
	en: {
		// Navigation & Sidebar
		'nav.home': 'Home',
		'nav.reports': 'Reports',
		'nav.group.front': 'Front of House',
		'nav.bookings': 'Bookings',
		'nav.floor': 'Floor Plan',
		'nav.orders': 'Orders',
		'nav.kds': 'Kitchen Display',
		'nav.pos': 'Take Order',
		'nav.events': 'Events',
		'nav.guests': 'Guests',
		'nav.reviews': 'Reviews',
		'nav.staff': 'Staff',
		'nav.group.menu': 'Menu',
		'nav.builder': 'Menu Builder',
		'nav.design': 'Design & Preview',
		'nav.qr': 'QR Code',
		'nav.hours': 'Opening Hours',
		'nav.group.setup': 'Setup',
		'nav.integrations': 'Integrations',
		'nav.emails': 'Emails',
		'nav.access': 'Access Control',
		'nav.activity': 'Activity Log',
		'nav.settings': 'Settings',
		'nav.support': 'Support & Help',
		'nav.expand': 'Expand menu',
		'nav.collapse': 'Collapse menu',

		// Common Buttons & Labels
		'common.save': 'Save',
		'common.saving': 'Saving…',
		'common.saved': 'Saved',
		'common.cancel': 'Cancel',
		'common.delete': 'Delete',
		'common.edit': 'Edit',
		'common.add': 'Add',
		'common.filter': 'Filter',
		'common.search': 'Search…',
		'common.actions': 'Actions',
		'common.status': 'Status',
		'common.total': 'Total',
		'common.subtotal': 'Subtotal',
		'common.tax': 'Tax',
		'common.discount': 'Discount',
		'common.date': 'Date',
		'common.time': 'Time',
		'common.customer': 'Customer',
		'common.table': 'Table',
		'common.items': 'Items',
		'common.price': 'Price',
		'common.notes': 'Notes',
		'common.print': 'Print',
		'common.export': 'Export',
		'common.import': 'Import',
		'common.close': 'Close',
		'common.back': 'Back',
		'common.next': 'Next',
		'common.confirm': 'Confirm',
		'common.clear': 'Clear',

		// Topbar & Header
		'topbar.search_placeholder': 'Search dishes, orders, bookings… (⌘K)',
		'topbar.quick_actions': 'Quick Actions',
		'topbar.new_order': 'New Order',
		'topbar.new_booking': 'New Booking',
		'topbar.notifications': 'Notifications',
		'topbar.online': 'Online',
		'topbar.offline': 'Offline (Changes will sync when online)',
		'topbar.language': 'Language / اللغة',

		// Dashboard
		'dash.title': 'Overview',
		'dash.subtitle': 'Real-time performance and current service metrics.',
		'dash.today_sales': 'Today\'s Sales',
		'dash.active_orders': 'Active Orders',
		'dash.today_bookings': 'Today\'s Bookings',
		'dash.avg_order_val': 'Avg. Order Value',
		'dash.recent_orders': 'Recent Orders',
		'dash.upcoming_bookings': 'Upcoming Bookings',
		'dash.kitchen_status': 'Kitchen Live Status',

		// Menu Builder
		'builder.title': 'Menu Builder',
		'builder.subtitle': 'Organise your dishes, categories, prices, and allergen details.',
		'builder.add_item': '+ Add Dish',
		'builder.add_section': '+ Add Category',
		'builder.uncategorised': 'Uncategorised Dishes',
		'builder.archive': 'Archived Dishes',
		'builder.allergens': 'Allergens',
		'builder.dietary': 'Dietary Badges',

		// POS View
		'pos.title': 'POS / Take Order',
		'pos.subtitle': 'Fast ordering for dine-in tables, takeaway, and counter service.',
		'pos.cart': 'Current Order',
		'pos.send_kitchen': 'Send to Kitchen',
		'pos.checkout': 'Pay & Complete',
		'pos.dinein': 'Dine-In',
		'pos.takeaway': 'Takeaway',
		'pos.table_select': 'Select Table',
		'pos.guest_count': 'Guests',

		// Kitchen View (KDS)
		'kds.title': 'Kitchen Display System',
		'kds.subtitle': 'Live ticket queue for chef and kitchen staff.',
		'kds.new': 'New Tickets',
		'kds.preparing': 'Preparing',
		'kds.ready': 'Ready to Serve',
		'kds.mark_ready': 'Mark Ready',
		'kds.complete': 'Complete',

		// Bookings View
		'bookings.title': 'Reservations & Bookings',
		'bookings.subtitle': 'Manage table reservations, guest lists, and seating.',
		'bookings.new_reservation': '+ New Reservation',
		'bookings.calendar': 'Calendar View',
		'bookings.list': 'List View',
		'bookings.confirmed': 'Confirmed',
		'bookings.seated': 'Seated',
		'bookings.cancelled': 'Cancelled',

		// Orders View
		'orders.title': 'Orders Log',
		'orders.subtitle': 'Complete history of dine-in, takeaway, and QR orders.',
		'orders.all': 'All Orders',
		'orders.open': 'Open Orders',
		'orders.paid': 'Paid',
		'orders.refunded': 'Refunded',

		// Reports View
		'reports.title': 'Reports & Analytics',
		'reports.subtitle': 'Sales reports, popular dishes, peak hours, and staff performance.',

		// QR & Settings & Design
		'qr.title': 'QR Table Cards',
		'qr.subtitle': 'Generate and print QR code cards for contactless diner menus and ordering.',
		'settings.title': 'Settings',
		'settings.subtitle': 'Configure restaurant info, GCC currencies, brand colours, and options.',
		'design.title': 'Design & Typography',
		'design.subtitle': 'Customise menu layout, Arabic web fonts (Tajwal, Almarai, Cairo, etc.), and themes.',
	},
	ar: {
		// Navigation & Sidebar
		'nav.home': 'الرئيسية',
		'nav.reports': 'التقارير والإحصائيات',
		'nav.group.front': 'الاستقبال والخدمة',
		'nav.bookings': 'الحجوزات',
		'nav.floor': 'مخطط الطاولات',
		'nav.orders': 'الطلبات',
		'nav.kds': 'شاشة المطبخ (KDS)',
		'nav.pos': 'تسجيل طلب (نقطة البيع)',
		'nav.events': 'الفعاليات والمناسبات',
		'nav.guests': 'سجل الضيوف',
		'nav.reviews': 'التقييمات والآراء',
		'nav.staff': 'الموظفون',
		'nav.group.menu': 'قائمة الطعام',
		'nav.builder': 'مُنشئ القائمة',
		'nav.design': 'التصميم والمعاينة',
		'nav.qr': 'رمز QR والبطاقات',
		'nav.hours': 'أوقات العمل',
		'nav.group.setup': 'الإعدادات والنظام',
		'nav.integrations': 'الربط والتكامل',
		'nav.emails': 'الرسائل والبريد',
		'nav.access': 'صلاحيات الموظفين',
		'nav.activity': 'سجل النشاطات',
		'nav.settings': 'إعدادات المطعم',
		'nav.support': 'الدعم والمساعدة',
		'nav.expand': 'توسيع القائمة',
		'nav.collapse': 'طّي القائمة',

		// Common Buttons & Labels
		'common.save': 'حفظ',
		'common.saving': 'جاري الحفظ…',
		'common.saved': 'تم الحفظ',
		'common.cancel': 'إلغاء',
		'common.delete': 'حذف',
		'common.edit': 'تعديل',
		'common.add': 'إضافة',
		'common.filter': 'تصفية',
		'common.search': 'بحث…',
		'common.actions': 'إجراءات',
		'common.status': 'الحالة',
		'common.total': 'الإجمالي',
		'common.subtotal': 'المجموع الفرعي',
		'common.tax': 'الضريبة',
		'common.discount': 'الخصم',
		'common.date': 'التاريخ',
		'common.time': 'الوقت',
		'common.customer': 'العميل',
		'common.table': 'الطاولة',
		'common.items': 'الأصناف',
		'common.price': 'السعر',
		'common.notes': 'ملاحظات',
		'common.print': 'طباعة',
		'common.export': 'تصدير',
		'common.import': 'استيراد',
		'common.close': 'إغلاق',
		'common.back': 'رجوع',
		'common.next': 'التالي',
		'common.confirm': 'تأكيد',
		'common.clear': 'مسح',

		// Topbar & Header
		'topbar.search_placeholder': 'ابحث في الأصناف، الطلبات، الحجوزات… (⌘K)',
		'topbar.quick_actions': 'إجراءات سريعة',
		'topbar.new_order': 'طلب جديد',
		'topbar.new_booking': 'حجز جديد',
		'topbar.notifications': 'الإشعارات',
		'topbar.online': 'متصل بالشبكة',
		'topbar.offline': 'غير متصل (ستتم المزامنة عند الاتصال)',
		'topbar.language': 'اللغة / Language',

		// Dashboard
		'dash.title': 'لوحة التحكم',
		'dash.subtitle': 'متابعة حية للمبيعات، الطلبات الحالية، ومؤشرات الأداء.',
		'dash.today_sales': 'مبيعات اليوم',
		'dash.active_orders': 'الطلبات النشطة',
		'dash.today_bookings': 'حجوزات اليوم',
		'dash.avg_order_val': 'متوسط قيمة الطلب',
		'dash.recent_orders': 'أحدث الطلبات',
		'dash.upcoming_bookings': 'الحجوزات القادمة',
		'dash.kitchen_status': 'حالة المطبخ المباشرة',

		// Menu Builder
		'builder.title': 'مُنشئ القائمة',
		'builder.subtitle': 'إدارة الأصناف، الأقسام، الأسعار، ومسببات الحساسية.',
		'builder.add_item': '+ إضافة صنف',
		'builder.add_section': '+ إضافة قسم',
		'builder.uncategorised': 'أصناف غير مصنفة',
		'builder.archive': 'الأصناف المؤرشفة',
		'builder.allergens': 'مسببات الحساسية',
		'builder.dietary': 'الشارات الغذائية',

		// POS View
		'pos.title': 'نقطة البيع / تسجيل طلب',
		'pos.subtitle': 'تسجيل الطلبات السريع لطاولات المحلي، السفري، والكاونتر.',
		'pos.cart': 'سلة الطلب الحالي',
		'pos.send_kitchen': 'إرسال للمطبخ',
		'pos.checkout': 'دفع وإتمام الطلب',
		'pos.dinein': 'تناول في المطعم (محلي)',
		'pos.takeaway': 'طلب سفري / استلام',
		'pos.table_select': 'اختر الطاولة',
		'pos.guest_count': 'عدد الضيوف',

		// Kitchen View (KDS)
		'kds.title': 'شاشة المطبخ (KDS)',
		'kds.subtitle': 'عرض طلبات المطبخ والتأهيل المباشر للطهاة.',
		'kds.new': 'طلبات جديدة',
		'kds.preparing': 'جاري التحضير',
		'kds.ready': 'جاهز للتقديم',
		'kds.mark_ready': 'تحديد كـ جاهز',
		'kds.complete': 'إكتمل الطلب',

		// Bookings View
		'bookings.title': 'الحجوزات والطاولات',
		'bookings.subtitle': 'إدارة حجوزات الطاولات، قائمة الضيوف، وتوزيع الجلسات.',
		'bookings.new_reservation': '+ حجز جديد',
		'bookings.calendar': 'عرض التقويم',
		'bookings.list': 'عرض القائمة',
		'bookings.confirmed': 'مؤكد',
		'bookings.seated': 'تمت الجلسة',
		'bookings.cancelled': 'ملغى',

		// Orders View
		'orders.title': 'سجل الطلبات',
		'orders.subtitle': 'سجل كامل لجميع الطلبات المحلية، السفري، والطلب عبر QR.',
		'orders.all': 'جميع الطلبات',
		'orders.open': 'الطلبات المفتوحة',
		'orders.paid': 'مدفوع',
		'orders.refunded': 'مسترجع',

		// Reports View
		'reports.title': 'التقارير والإحصائيات',
		'reports.subtitle': 'تقارير المبيعات، الأصناف الأكثر طلباً، أوقات الذروة، وأداء الطاقم.',

		// QR & Settings & Design
		'qr.title': 'بطاقات رمز QR',
		'qr.subtitle': 'إنشاء وطباعة بطاقات QR للطاولات لاستعراض القائمة والطلب بدون تلامس.',
		'settings.title': 'إعدادات المطعم',
		'settings.subtitle': 'ضبط معلومات المطعم، العملات الخليجية، الألوان، والخيارات العامة.',
		'design.title': 'التصميم والخطوط العربية',
		'design.subtitle': 'تخصيص مظهر القائمة، الخطوط العربية السعودية (تجوال، المرعي، القاهرة، إلخ)، والتنسيق.',
	},
};

// Initial language selection (Arabic by default for localized build or saved user preference)
const getInitialLang = () => {
	if ( typeof window === 'undefined' ) {
		return 'ar';
	}
	const saved = localStorage.getItem( 'dinekit_lang' );
	if ( saved === 'ar' || saved === 'en' ) {
		return saved;
	}
	// Fall back to Arabic if HTML dir is rtl or site is Arabic
	if ( typeof document !== 'undefined' && ( document.dir === 'rtl' || ( document.documentElement.lang && document.documentElement.lang.startsWith( 'ar' ) ) ) ) {
		return 'ar';
	}
	return 'ar'; // Arabic default
};

const I18nContext = createContext();

export function I18nProvider( { children } ) {
	const [ lang, setLangState ] = useState( getInitialLang );

	const setLang = ( nextLang ) => {
		setLangState( nextLang );
		localStorage.setItem( 'dinekit_lang', nextLang );
		applyLangDOM( nextLang );
	};

	const applyLangDOM = ( currentLang ) => {
		if ( typeof document === 'undefined' ) {
			return;
		}
		const isRtl = currentLang === 'ar';
		document.dir = isRtl ? 'rtl' : 'ltr';
		document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
		const root = document.getElementById( 'dinekit-root' );
		if ( root ) {
			root.dir = isRtl ? 'rtl' : 'ltr';
			if ( isRtl ) {
				root.classList.add( 'rtl' );
			} else {
				root.classList.remove( 'rtl' );
			}
		}
	};

	useEffect( () => {
		applyLangDOM( lang );
	}, [ lang ] );

	const t = ( key, fallback = '' ) => {
		if ( translations[ lang ] && translations[ lang ][ key ] ) {
			return translations[ lang ][ key ];
		}
		if ( translations.en[ key ] ) {
			return translations.en[ key ];
		}
		return fallback || key;
	};

	return (
		<I18nContext.Provider value={ { lang, setLang, t, isRtl: lang === 'ar' } }>
			{ children }
		</I18nContext.Provider>
	);
}

export function useI18n() {
	const ctx = useContext( I18nContext );
	if ( ! ctx ) {
		return {
			lang: 'ar',
			setLang: () => {},
			t: ( k, fb ) => fb || k,
			isRtl: true,
		};
	}
	return ctx;
}
