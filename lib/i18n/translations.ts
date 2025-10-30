export const translations = {
  en: {
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    
    // Menu
    menu: {
      withdraw: "Withdraw Money",
      sendAccounts: "Send Accounts",
      orders: "Orders",
      channel: "Channel",
      available: "AVAILABLE",
      balance: "Available Balance",
      usdt: "USDT",
    },
    
    // Withdrawal
    withdrawal: {
      title: "Withdraw Money",
      amount: "Withdrawal Amount (USDT)",
      enterAmount: "Enter amount",
      minimum: "Minimum withdrawal",
      selectNetwork: "Select Network",
      tronNetwork: "Tron Network",
      polygonNetwork: "Polygon Network",
      walletAddress: "Wallet Address",
      enterAddress: "Enter your {network} wallet address",
      makeValid: "Make sure you enter a valid {network} address",
      withdraw: "Withdraw",
      processing: "Processing...",
      pendingExists: "Pending Withdrawal Exists",
      waitForCurrent: "Please wait for your current withdrawal to be confirmed or rejected before submitting another.",
      submitted: "Withdrawal Submitted",
      pendingAmount: "{amount} USDT withdrawal pending",
      invalidAmount: "Invalid Amount",
      enterValid: "Please enter a valid withdrawal amount",
      lowBalance: "Low Balance",
      insufficientBalance: "Insufficient Balance",
      yourBalance: "Your balance is {balance} USDT",
      unableToIdentify: "Unable to identify user",
      failed: "Withdrawal Failed",
      tryAgain: "Please try again",
      networkError: "Network error. Please try again",
    },
    
    // Admin Dashboard
    admin: {
      title: "Admin Dashboard",
      subtitle: "Manage your platform",
      sections: "Admin Sections",
      logout: "Logout",
      exitPanel: "Exit admin panel",
      logoutConfirm: "Are you sure you want to logout?",
      
      // Tabs
      overview: "Overview",
      users: "Users",
      analytics: "Analytics",
      referrals: "Referrals",
      payments: "Payments",
      countries: "Countries",
      sessions: "Sessions",
      settings: "Settings",
      
      // Overview
      totalUsers: "Total Users",
      activeUsers: "Active Users",
      totalRevenue: "Total Revenue",
      pendingWithdrawals: "Pending Withdrawals",
      recentWithdrawals: "Recent Withdrawals",
      
      // Settings
      settingsTitle: "System Settings",
      minWithdrawal: "Minimum Withdrawal Amount",
      loginButton: "Enable Login Button",
      loginButtonDesc: "Allow users to submit login requests",
      defaultLanguage: "Default Language",
      selectLanguage: "Select default website language",
      saveSettings: "Save Settings",
      settingsSaved: "Settings saved successfully!",
      
      // Payments
      paymentsTitle: "Payment Requests Management",
      reviewPayments: "Review and process payment requests",
      userName: "User Name",
      amount: "Amount",
      walletAddress: "Wallet Address",
      status: "Status",
      date: "Date",
      actions: "Actions",
      approve: "Approve",
      reject: "Reject",
      noPayments: "No payment requests found",
      copyAddress: "Wallet address copied to clipboard!",
      
      // Referrals
      createReferral: "Create Master Referral Code",
      generateCode: "Generate a standalone referral code that can be used independently",
      codeName: "Enter code name (optional)",
      generate: "Generate Code",
      referralManagement: "Referral Program Management",
      manageReferrals: "Manage all referral links and track referral performance",
      usedCount: "Used Count",
      active: "Active",
      inactive: "Inactive",
      created: "Created",
      botLink: "Bot Link",
      copy: "Copy",
      deleteCode: "Delete",
      deleteConfirm: "Are you sure you want to delete the referral code \"{name}\"?\n\nThis action cannot be undone.",
      codeDeleted: "Referral code deleted successfully!",
    },
    
    // Transaction List
    transaction: {
      pending: "PENDING",
      accepted: "ACCEPTED",
      rejected: "REJECTED",
      login: "Login",
      loginDisabled: "Login Disabled by Admin",
      noTransactions: "No transactions found",
    },
  },
  
  ar: {
    // Common
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجح",
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
    delete: "حذف",
    edit: "تعديل",
    close: "إغلاق",
    
    // Menu
    menu: {
      withdraw: "سحب الأموال",
      sendAccounts: "إرسال الحسابات",
      orders: "الطلبات",
      channel: "القناة",
      available: "متاح",
      balance: "الرصيد المتاح",
      usdt: "USDT",
    },
    
    // Withdrawal
    withdrawal: {
      title: "سحب الأموال",
      amount: "مبلغ السحب (USDT)",
      enterAmount: "أدخل المبلغ",
      minimum: "الحد الأدنى للسحب",
      selectNetwork: "اختر الشبكة",
      tronNetwork: "شبكة ترون",
      polygonNetwork: "شبكة بوليجون",
      walletAddress: "عنوان المحفظة",
      enterAddress: "أدخل عنوان محفظة {network}",
      makeValid: "تأكد من إدخال عنوان {network} صالح",
      withdraw: "سحب",
      processing: "جاري المعالجة...",
      pendingExists: "يوجد سحب معلق",
      waitForCurrent: "يرجى انتظار تأكيد أو رفض السحب الحالي قبل إرسال آخر.",
      submitted: "تم إرسال طلب السحب",
      pendingAmount: "سحب {amount} USDT قيد الانتظار",
      invalidAmount: "مبلغ غير صالح",
      enterValid: "يرجى إدخال مبلغ سحب صالح",
      lowBalance: "رصيد منخفض",
      insufficientBalance: "رصيد غير كافٍ",
      yourBalance: "رصيدك هو {balance} USDT",
      unableToIdentify: "تعذر التعرف على المستخدم",
      failed: "فشل السحب",
      tryAgain: "يرجى المحاولة مرة أخرى",
      networkError: "خطأ في الشبكة. يرجى المحاولة مرة أخرى",
    },
    
    // Admin Dashboard
    admin: {
      title: "لوحة الإدارة",
      subtitle: "إدارة منصتك",
      sections: "أقسام الإدارة",
      logout: "تسجيل الخروج",
      exitPanel: "الخروج من لوحة الإدارة",
      logoutConfirm: "هل أنت متأكد من تسجيل الخروج؟",
      
      // Tabs
      overview: "نظرة عامة",
      users: "المستخدمون",
      analytics: "التحليلات",
      referrals: "الإحالات",
      payments: "المدفوعات",
      countries: "البلدان",
      sessions: "الجلسات",
      settings: "الإعدادات",
      
      // Overview
      totalUsers: "إجمالي المستخدمين",
      activeUsers: "المستخدمون النشطون",
      totalRevenue: "إجمالي الإيرادات",
      pendingWithdrawals: "السحوبات المعلقة",
      recentWithdrawals: "السحوبات الأخيرة",
      
      // Settings
      settingsTitle: "إعدادات النظام",
      minWithdrawal: "الحد الأدنى لمبلغ السحب",
      loginButton: "تفعيل زر تسجيل الدخول",
      loginButtonDesc: "السماح للمستخدمين بإرسال طلبات تسجيل الدخول",
      defaultLanguage: "اللغة الافتراضية",
      selectLanguage: "اختر اللغة الافتراضية للموقع",
      saveSettings: "حفظ الإعدادات",
      settingsSaved: "تم حفظ الإعدادات بنجاح!",
      
      // Payments
      paymentsTitle: "إدارة طلبات الدفع",
      reviewPayments: "مراجعة ومعالجة طلبات الدفع",
      userName: "اسم المستخدم",
      amount: "المبلغ",
      walletAddress: "عنوان المحفظة",
      status: "الحالة",
      date: "التاريخ",
      actions: "الإجراءات",
      approve: "موافقة",
      reject: "رفض",
      noPayments: "لم يتم العثور على طلبات دفع",
      copyAddress: "تم نسخ عنوان المحفظة!",
      
      // Referrals
      createReferral: "إنشاء كود إحالة رئيسي",
      generateCode: "إنشاء كود إحالة مستقل يمكن استخدامه بشكل مستقل",
      codeName: "أدخل اسم الكود (اختياري)",
      generate: "إنشاء كود",
      referralManagement: "إدارة برنامج الإحالة",
      manageReferrals: "إدارة جميع روابط الإحالة وتتبع أداء الإحالة",
      usedCount: "عدد الاستخدامات",
      active: "نشط",
      inactive: "غير نشط",
      created: "تم الإنشاء",
      botLink: "رابط البوت",
      copy: "نسخ",
      deleteCode: "حذف",
      deleteConfirm: "هل أنت متأكد من حذف كود الإحالة \"{name}\"؟\n\nهذا الإجراء لا يمكن التراجع عنه.",
      codeDeleted: "تم حذف كود الإحالة بنجاح!",
    },
    
    // Transaction List
    transaction: {
      pending: "معلق",
      accepted: "مقبول",
      rejected: "مرفوض",
      login: "تسجيل الدخول",
      loginDisabled: "تم تعطيل تسجيل الدخول من قبل المسؤول",
      noTransactions: "لم يتم العثور على معاملات",
    },
  },
  
  zh: {
    // Common
    loading: "加载中...",
    error: "错误",
    success: "成功",
    cancel: "取消",
    confirm: "确认",
    save: "保存",
    delete: "删除",
    edit: "编辑",
    close: "关闭",
    
    // Menu
    menu: {
      withdraw: "提取资金",
      sendAccounts: "发送账户",
      orders: "订单",
      channel: "频道",
      available: "可用",
      balance: "可用余额",
      usdt: "USDT",
    },
    
    // Withdrawal
    withdrawal: {
      title: "提取资金",
      amount: "提款金额 (USDT)",
      enterAmount: "输入金额",
      minimum: "最低提款额",
      selectNetwork: "选择网络",
      tronNetwork: "波场网络",
      polygonNetwork: "Polygon网络",
      walletAddress: "钱包地址",
      enterAddress: "输入您的{network}钱包地址",
      makeValid: "确保输入有效的{network}地址",
      withdraw: "提款",
      processing: "处理中...",
      pendingExists: "存在待处理的提款",
      waitForCurrent: "请等待当前提款被确认或拒绝后再提交新的提款。",
      submitted: "提款已提交",
      pendingAmount: "{amount} USDT 提款待处理",
      invalidAmount: "无效金额",
      enterValid: "请输入有效的提款金额",
      lowBalance: "余额不足",
      insufficientBalance: "余额不足",
      yourBalance: "您的余额为 {balance} USDT",
      unableToIdentify: "无法识别用户",
      failed: "提款失败",
      tryAgain: "请重试",
      networkError: "网络错误。请重试",
    },
    
    // Admin Dashboard
    admin: {
      title: "管理面板",
      subtitle: "管理您的平台",
      sections: "管理部分",
      logout: "退出",
      exitPanel: "退出管理面板",
      logoutConfirm: "确定要退出吗？",
      
      // Tabs
      overview: "概览",
      users: "用户",
      analytics: "分析",
      referrals: "推荐",
      payments: "支付",
      countries: "国家",
      sessions: "会话",
      settings: "设置",
      
      // Overview
      totalUsers: "总用户数",
      activeUsers: "活跃用户",
      totalRevenue: "总收入",
      pendingWithdrawals: "待处理提款",
      recentWithdrawals: "最近提款",
      
      // Settings
      settingsTitle: "系统设置",
      minWithdrawal: "最低提款金额",
      loginButton: "启用登录按钮",
      loginButtonDesc: "允许用户提交登录请求",
      defaultLanguage: "默认语言",
      selectLanguage: "选择网站默认语言",
      saveSettings: "保存设置",
      settingsSaved: "设置保存成功！",
      
      // Payments
      paymentsTitle: "支付请求管理",
      reviewPayments: "审核和处理支付请求",
      userName: "用户名",
      amount: "金额",
      walletAddress: "钱包地址",
      status: "状态",
      date: "日期",
      actions: "操作",
      approve: "批准",
      reject: "拒绝",
      noPayments: "未找到支付请求",
      copyAddress: "钱包地址已复制！",
      
      // Referrals
      createReferral: "创建主推荐代码",
      generateCode: "生成可独立使用的推荐代码",
      codeName: "输入代码名称（可选）",
      generate: "生成代码",
      referralManagement: "推荐计划管理",
      manageReferrals: "管理所有推荐链接并跟踪推荐表现",
      usedCount: "使用次数",
      active: "活跃",
      inactive: "不活跃",
      created: "创建时间",
      botLink: "机器人链接",
      copy: "复制",
      deleteCode: "删除",
      deleteConfirm: "确定要删除推荐代码\"{name}\"吗？\n\n此操作无法撤消。",
      codeDeleted: "推荐代码删除成功！",
    },
    
    // Transaction List
    transaction: {
      pending: "待处理",
      accepted: "已接受",
      rejected: "已拒绝",
      login: "登录",
      loginDisabled: "管理员已禁用登录",
      noTransactions: "未找到交易",
    },
  },
} as const

export type Language = keyof typeof translations
export type TranslationKeys = typeof translations.en
