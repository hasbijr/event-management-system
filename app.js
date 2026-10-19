// `require()` mengambil modul dari package atau file lain.
// Express digunakan untuk membuat server dan menangani route HTTP.
const express = require('express');
const app = express();
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const bycrypt = require('bcryptjs');
require('dotenv').config();
// Destructuring mengambil beberapa properti langsung dari object module.
// Sequelize adalah ORM: kita menulis JavaScript, lalu ORM menerjemahkannya menjadi SQL.
const {Sequelize, DataTypes, Op} =  require('sequelize');
const {error} = require('console');
const multer = require('multer');
const { deserialize } = require('v8');
const {title, availableMemory} =  require('process');
const { Xendit } = require('xendit-node');
const { stringify } = require('querystring');


const PORT = process.env.PORT;

// Middleware berjalan di antara request dari browser dan route.
// Middleware dapat membaca, mengubah, atau meneruskan request ke proses berikutnya.
app.use(express.urlencoded({extended: true}))
app.use(express.json())

// `express.static()` membuat file di folder `public` bisa diakses langsung oleh browser.
app.use(express.static('public'))

// Session menyimpan data login antar-request.
// `secret` dipakai untuk menandatangani cookie agar tidak mudah dipalsukan.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

}))


//uploader
const storage = multer.diskStorage({
    destination: (req,file,cb ) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
})


const upload = multer({ storage })
//end uploader with multer

// EJS dipakai sebagai view engine untuk membuat HTML dari template.
app.set('view engine', 'ejs')
// `path.join()` membuat path yang aman dan sesuai sistem operasi.
app.set('views', path.join(__dirname,'views')) // views/home

// Instance Sequelize ini adalah koneksi dan konfigurasi utama ke database MySQL.
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST || 'localhost',
        dialect:'mysql',
        logging:false
    }
)


// Cara mengecek koneksi database secara manual.
// Kode ini sengaja dinonaktifkan karena `startServer()` melakukan pengecekan yang sama.
// sequelize.authenticate()
//     .then(() => {
//         console.log("Database Successfully Connected..")
//     })
//     .catch((err) => {
//         console.log("Fail connect to database, due to ", err.message)
//     })


//Xendit config
const xendit = new Xendit({
    secretKey: process.env.XENDIT_SECRET_KEY 
})

const {Invoice} = xendit
//end xendit config


// Model adalah representasi tabel database dalam bentuk object JavaScript.
// Setiap property di dalamnya menjadi kolom tabel beserta aturan validasinya.

const User = sequelize.define('User', {
    id: {type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
    name: {type:DataTypes.STRING(255),allowNull:false},
    email: {type:DataTypes.STRING(255),allowNull:false, unique:true},
    password: {type:DataTypes.STRING(255),allowNull:false},
    phone: {type:DataTypes.STRING(20),allowNull:false},
    role: {type:DataTypes.STRING(10),defaultValue:'user'},
    avatar: {type:DataTypes.STRING(255)},
}, {
    tableName:'users',
    timestamps:true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

const Category = sequelize.define('Category', {
    id: {type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
    name: {type:DataTypes.STRING(100), allowNull:false},
    description: {type:DataTypes.TEXT, allowNull:false},
    icon: {type:DataTypes.STRING(50), allowNull:false},
}, {
    tableName:'categories',
    timestamps:true,
    createdAt: 'created_at',
    updatedAt: false
})

const Event = sequelize.define('Event', {
    id: {type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
    title: {type: DataTypes.STRING(255), allowNull:false},
    description: {type: DataTypes.TEXT, allowNull:false},
    image_path: {type: DataTypes.STRING(255), allowNull:false},
    venue: {type: DataTypes.STRING(255), allowNull:false},
    city: {type: DataTypes.STRING(100)},
    event_date: {type:DataTypes.DATE, allowNull:false},
    event_end_date: {type:DataTypes.DATE, allowNull:false},
    max_attendees: {type: DataTypes.INTEGER, allowNull:false},
    price: {type: DataTypes.DECIMAL(10,2), allowNull:false},
    available_tickets: {type: DataTypes.INTEGER, allowNull: false},
    is_published: {type:DataTypes.BOOLEAN, defaultValue: false},
},{
    tableName:'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at' 
})

const Order = sequelize.define('Order', {
    id: {type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
    quantity: {type: DataTypes.INTEGER, allowNull: false},
    total_amount: {type: DataTypes.DECIMAL(10,2), allowNull:false},
    status: {type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'expired', 'failed'), defaultValue:'pending'},
    xendit_invoice_id: {type: DataTypes.STRING(255)},
    xendit_payment_url: {type: DataTypes.TEXT},
    xendit_expiry_data: {type: DataTypes.DATE},
    external_id: {type: DataTypes.STRING(255)},
},{
    tableName:'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at' 

})

const Ticket = sequelize.define('Ticket',{
    id: {type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
    ticket_code: {type: DataTypes.STRING(100), allowNull: false, unique: true},
    barcode_data: {type: DataTypes.TEXT, allowNull:false},
    attendee_name: {type: DataTypes.STRING(255), allowNull: false},
    attendee_email: {type: DataTypes.STRING(255), allowNull: false},
    attendee_phone: {type: DataTypes.STRING(20), allowNull: false},
    is_attended: {type:DataTypes.BOOLEAN, defaultValue: false},
    attended_at: {type: DataTypes.DATE},
},{
    tableName:'tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at' 
})

const EventAttachment = sequelize.define('EventAttachment',{
    id: {type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
    file_path: {type: DataTypes.STRING(255), allowNull: false},
    file_type: {type: DataTypes.ENUM('image', 'document'), defaultValue:'image'},
},{
    tableName:'event_attachments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at' 
})


const XenditWebhookLog = sequelize.define('XenditWebhookLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  webhook_id: {
    type: DataTypes.STRING(255)
  },
  event: {
    type: DataTypes.STRING(100)
  },
  invoice_id: {
    type: DataTypes.STRING(255)
  },
  external_id: {
    type: DataTypes.STRING(255)
  },
  status: {
    type: DataTypes.STRING(50)
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  payment_method: {
    type: DataTypes.STRING(100)
  },
  payment_channel: {
    type: DataTypes.STRING(100)
  },
  currency: {
    type: DataTypes.STRING(10)
  },
  received_data: {
    type: DataTypes.TEXT
  },
  processed: {
    type: DataTypes.BOOLEAN, // Mewakili TINYINT(1)
    defaultValue: false
  },
  processing_error: {
    type: DataTypes.TEXT
  },
  headers: {
    type: DataTypes.TEXT
  }
}, {
  // Opsi Model
  tableName: 'xendit_webhook_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at' 
});

// Association menjelaskan hubungan antar-model/tabel.
// `hasMany` berarti satu data memiliki banyak data terkait.
// `belongsTo` berarti data ini menyimpan foreign key menuju data induknya.

User.hasMany(Event, {
    foreignKey: 'creator_id',
    // RESTRICT mencegah data induk dihapus jika masih dipakai oleh data anak.
    onDelete: 'RESTRICT',
    // CASCADE meneruskan perubahan key induk ke data yang terkait.
    onUpdate: 'CASCADE'
})

Event.belongsTo(User, {
    foreignKey: 'creator_id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
})

Category.hasMany(Event, {
    foreignKey: 'category_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Event.belongsTo(Category, {
    foreignKey: 'category_id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
})

User.hasMany(Order, {
    foreignKey: 'user_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Order.belongsTo(User, {
    foreignKey: 'user_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Event.hasMany(Order, {
    foreignKey: 'event_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Order.belongsTo(Event, {
    foreignKey: 'event_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Order.hasMany(Ticket, {
    foreignKey: 'order_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Ticket.belongsTo(Order, {
    foreignKey: 'order_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Event.hasMany(Ticket, {
    foreignKey: 'event_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Ticket.belongsTo(Event, {
    foreignKey: 'event_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

Event.hasMany(EventAttachment, {
    foreignKey: 'event_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

EventAttachment.belongsTo(Event,{
    foreignKey: 'event_id',
    onDelete: 'RESTRICT', 
    onUpdate: 'CASCADE' 
})

//Middleware
const requiredAuth = (req,res,next) => {
    if(!req.session.user){
        return res.redirect('login')
    }
    next();
}

const requiredCreator = (req,res,next) => {
    if(!req.session.user || req.session.user.role !== 'creator'){
        return res.redirect('/')
    }
    next();
}

//End middleware


// Controller menerima request, mengambil/mengolah data, lalu mengirim response.
// `async` memungkinkan penggunaan `await` untuk menunggu query database selesai.
app.get('/', async (req,res) => {
    try{
        // Query ini menghasilkan Promise; `await` menunggu hasilnya sebelum lanjut.
        const categories = await Category.findAll();

        let cities = [];

        // Query kota dipisahkan dalam try/catch agar kegagalannya tidak menghentikan
        // seluruh halaman utama. Jika gagal, aplikasi memakai daftar cadangan.
        try{
            const citiesData = await Event.findAll({
            // `fn` dan `col` membuat SQL DISTINCT pada kolom city.
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('city')), 'city']],
                where: {is_published : true},
                order: [['city', 'ASC']]
            })

            // `map` mengambil nilai city dari setiap row, lalu `filter` membuang nilai kosong.
            cities = citiesData.map(c => c.city).filter(city => city)
        }catch(error){
            console.error('Error Fethcing Data Cities :', error)
            cities = ['Jakarta', 'Bandung', 'Surabaya']
        }
        // `include` melakukan eager loading: data Category dan User diambil bersama event.
        const latestEvent = await Event.findAll({
            where: {is_published : true},
            include: [Category, User],
            order: [['created_at','DESC']],
            limit: 6
        })

        const upcomingEvents = await Event.findAll({
            where:{
                is_published : true,
            // `Op.gte` adalah operator Sequelize untuk "greater than or equal" (>=).
                event_date : {[Op.gte]: new Date()}
            },
            include: [Category, User],
            order: [['event_date', 'ASC']],
            limit: 6
        })

        // `res.render` mengubah template EJS menjadi HTML dan mengirimnya ke browser.
        res.render('home', {
            user: req.session.user,
            categories,
            cities: cities,
            latestEvent,
            upcomingEvents,

        })
    }catch(error){
        console.error(error);
        res.status(500).send('Server Error')
    }
})
//end


//Create Event (creator)
app.get('/events/create', requiredAuth, requiredCreator, async (req,res) => {
    try{
        const categories = await Category.findAll();
        res.render('events/create', {
            user: req.session.user,
            categories,
            errors: []
        })
    }catch(error){
        console.error(error)
        res.status(500).send('Server Error')
    }
})
//event create end

//post data create event
app.post('/events/create', requiredAuth, requiredCreator, upload.single('image'), async (req,res) => {
    try{
        const{
            title,
            description,
            venue,
            city,
            event_date,
            event_end_date,
            category_id,
            max_attendees,
            price,
            available_tickets
        } =  req.body

        const event = await Event.create({
            title,
            description,
            venue,
            city,
            event_date,
            event_end_date,
            category_id,
            max_attendees,
            price,
            available_tickets,
            creator_id : req.session.user.id,
            image_path : req.file ? `uploads/${req.file.filename}` : null,   
        })

        res.redirect(`/events/${event.id}`)
    }catch(error){
        console.error(error)
        const categories = await Category.findAll();
        res.render('events/create', {
            user: req.session.user,
            categories,
            errors: ['Terjadi Kesalahan saat membuat event'],
            formData: req.body
        })
    }
} )
//end post data create event


//EventDetail
app.get('/events/:id', async(req, res) =>{
    try{
        const event = await Event.findByPk(req.params.id, {
            include: [Category, User, EventAttachment]
        });

        if(!event){
            return res.status(404).send('Event Tidak Ditemukan');
        };

        res.render('events/detail', {
            user: req.session.user,
            event
        });
    }catch(error){
        console.error(error)
        res.status(500).send('Server error!');

    }
})

//events
app.get('/events', async(req,res) =>{
    try{
        const{category, search, city} = req.query;
        const where = {is_published: true};

        if(category) where.category_id = category;
        if(search) where.title = { [Op.like] : `%${search}%`};
        if(city) where.city = city;

        const events = await Event.findAll({
            where,
            include: [Category, User],
            order: [['event_date', 'ASC']]
        });
        
        const categories = await Category.findAll();
        let cities = [];

        try{
            const citiesData = await Event.findAll({
            // `fn` dan `col` membuat SQL DISTINCT pada kolom city.
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('city')), 'city']],
                where: {is_published : true},
                order: [['city', 'ASC']]
            });
            cities = citiesData.map(c => c.city).filter(city => city)
        }catch(error){
            console.error('Error Fethcing Data Cities :', error)
            cities = ['Jakarta', 'Bandung', 'Surabaya']
        }

        res.render('events/index', {
            user: req.session.user,
            events,
            categories,
            cities: cities,
            selectedCategory: category,
            searchquery: search,
            selectedCity: city
        })

    }catch(error){
        console.error(error);
        res.status(500).send('Internal Server Error')
    }
})
//end

// My Event Page
app.get('/my-events', requiredAuth, async (req,res)=> {
 try{
    const events = await Event.findAll({
        where: {creator_id : req.session.user.id},
        include: [Category],
        order: [['created_at', 'DESC']]
    })
    
    res.render('events/my-events', {
        user: req.session.user,
        events
    })
 }catch(error){
    console.error(error)
    res.status(500).send('Server Error')

 }
})
//End my event page

//Edit my event page
app.get('/events/:id/edit', requiredAuth, requiredCreator, async (req,res)=>{
    try{
        const event = await Event.findByPk(req.params.id, {
            include: [Category]
        })
        if(!event || event.creator_id !== req.session.user.id){
            return res.status(403).send('Anda Tidak Diizinkan')
        }

        const categories = await Category.findAll()

        res.render('events/edit', {
            user: req.session.user,
            event,
            categories,
            errors: [],
            formData: {}
        })
    }catch(error){
        console.error(error)
        res.status(500).send('Server Error')
    }
})

//End edit event


//Logic untuk edit my event
app.post('/events/:id/edit', requiredAuth, requiredCreator, async (req, res) => {
    try{
        const event = await Event.findByPk(req.params.id)

        if(!event || event.creator_id !== req.session.user.id){
            return res.status(403).send('Anda Tidak Diizinkan')
        }

        const updatedData = {
            title : req.body.title,
            description : req.body.description,
            venue : req.body.venue,
            city : req.body.city,
            event_date : req.body.event_date,
            event_end_date : req.body.event_end_date,
            category_id : req.body.category_id,
        }

        await event.update(updatedData)
        res.redirect(`/events/${event.id}`)
    }catch(error){
        console.error(error)

        const categories = await Category.findAll()
        const event =  await Event.findByPk(req.params.id, {include:[Category]})
        res.render('events/edit', {
            user: req.session.user,
            event,
            categories,
            errors: ['Terjadi Kesalahan saat update event'],
            formData: req.body
        })
    }
})
//End logikca untuk edit my event

//privacy
app.get('/privacy', (req, res) =>{
    res.render('privacy', {
        user: req.session.user,
        title: 'Privacy Policy - Eventra'

    })
})
//end

//terms
app.get('/terms', (req,res) =>{
    res.render('terms', {
        user: req.session.user,
        title: 'Terms of Service - Eventra'
    })
})
//end


//register page
app.get('/register', (req,res) => {
 res.render('auth/register', {
    user: req.session.user,
    errors: []

 })
})
//end register

//login page
app.get('/login', (req,res) => {
    res.render('auth/login', {
        user: req.session.user,
        errors: []
    });
})

//logic register
app.post('/register', async(req, res) => {
    try{
        const {name,email,password, phone, role} = req.body;
        const existingUser = await User.findOne({ where: {email} });

        if(existingUser){
            return res.render('auth/register', {
                user: req.session.user,
                errors: ['Email Sudah Terdaftar'],
                formData: req.body
            })
           
        }
        const hashedPassword = await bycrypt.hash(password, 10);
        
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: role || 'user'
        });

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.redirect('/')
    }catch(error){
        console.error(error);
        return res.render('auth/register', {
            user: req.session.user,
            errors: ['Terjadi Kesalahan Saat Registrasi'],
            formData: req.body
        })
    }

})
//end logic


//logout
app.post('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/');
})
//end logout

//logic login
app.post('/login', async(req,res) => {
     try{
        const {email, password} = req.body;
        const user = await User.findOne({ where: {email} });

        if(!user){
            return res.render('auth/login', {
                user: req.session.user,
                errors: ['Email atau Password Salah'],
                formData: req.body
            })  
        }


        const isInvalidPassword = await bycrypt.compare(password, user.password)

        if(!isInvalidPassword){
            return res.render('auth/login', {
                user: req.session.user,
                errors: ['Email atau Password Salah'],
                formData: req.body
            })  
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.redirect('/')
    }catch(error){
        console.error(error);
        return res.render('auth/login', {
            user: req.session.user,
            errors: ['Terjadi Kesalahan Saat Login'],
            formData: req.body
        })
    }


})
//end login

//checkout page
app.get('/events/:id/checkout', requiredAuth, async(req,res) => {
    try{
        const event = await Event.findByPk(req.params.id)

        if(!event){
            return res.status(404).send('Event Tidak Ditemukan')
        }

        res.render('orders/checkout', {
            user: req.session.user,
            event,
            errors: []
        })
    }catch(error){
        console.error(error)
        res.status(500).send('Server Error')
    }
})
//end checkout

//checkout redirect ke payment process
app.post('/events/:id/checkout', requiredAuth, async(req,res) => {
    try{
        const { quantity, attendee_name, attendee_email, attendee_phone} = req.body
        const event_id = req.params.id
        console.log('Checkout data: ', {event_id, quantity, attendee_name})

        const event = await Event.findByPk(event_id)
        if(!event){
            return res.status(404).send('Event tidak ditemukan')
        }

        
        if(event.available_tickets < quantity){
            return res.render('orders/checkout', {
                user: req.session.user,
                event,
                errors : ['Jumlah tiket melebihi batas'],
                formData: req.body
            })
        }

        //redirect ke payment process
        res.redirect(`/payment/process/${event_id}?quantity=${quantity}&name=${encodeURIComponent(attendee_name)}&email=${encodeURIComponent(attendee_email)}&phone=${encodeURIComponent(attendee_phone)}`)
    }catch(error){
        console.error('Checkout Error', error)
        const event =  await Event.findByPk(req.params.id)
        return res.render('orders/checkout', {
                user: req.session.user,
                event,
                errors : ['Terjadi Kesalahan saat proses checkout'],
                formData: req.body
            })
    }
})
//end checkout dengan redirect ke payment process


//payment process route
app.get('/payment/process/:event_id', requiredAuth, async(req,res) => {
    try{
        const {event_id} = req.params
        const {quantity,name,email,phone} = req.query

        const event = await Event.findByPk(event_id)

        if(!event){
            return res.status(404).send('Event tidak ditemukan')
        }

        const total_amount = event.price * quantity

        // generate unique external id
        const externalID = `event-order-${Date.now()}-${Math.random().toString(36).substr(2,9)}`

        //create invoiceData
        const invoiceData = {
            externalId : externalID,
            amount: parseFloat(total_amount),
            description: `Pembelian ${quantity} tiket untuk : ${event.title}`,
            // invoiceDuration: '86400',
            invoiceDuration: '1',
            customer: {
                givenNames : name,
                email : email,
                mobileNumber: phone
            },
            successRedirectURL: `http://localhost:${PORT}/orders/success?order_id=${externalID}`,
            failureRedirectURL: `http://localhost:${PORT}/orders/failed?order_id=${externalID}`,
            currency: "IDR" ,
            items: [
                {
                    name: event.title,
                    quantity: parseInt(quantity),
                    price: parseFloat(event.price),
                    category: 'Event Ticket',
                }
            ]
        }
        console.log("Creating xendit invoice with data", invoiceData)

        const xenditResponse = await Invoice.createInvoice({
            data: invoiceData
        })
        //create order
        const order = await Order.create({
            user_id : req.session.user.id,
            event_id : event.id,
            quantity: parseInt(quantity),
            total_amount : total_amount,
            status: 'pending',
            xendit_invoice_id : xenditResponse.id,
            xendit_payment_url: xenditResponse.invoiceUrl,
            xendit_expiry_data : new Date(xenditResponse.expiryDate),
            external_id: externalID
        })

        //generate ticket
        for(let i = 0; i < quantity; i++){
            const ticketCode = `TK-${Date.now()}-${Math.random().toString(36).substr(2,9).toUpperCase()}`
            const barcodeData = `EVENT-${event_id}-${ticketCode}-${order.id}`

            await Ticket.create({
                order_id: order.id,
                event_id: event.id,
                ticket_code: ticketCode,
                barcode_data: barcodeData,
                attendee_name: name,
                attendee_email: email,
                attendee_phone: phone
            })
        }

        await event.update({
            available_tickets: event.available_tickets - quantity
        })
        res.redirect(xenditResponse.invoiceUrl)
    }catch(error){
        console.error('Payment Process Error', error)
        res.status(500).send('Terjadi kesalahan saat memproses pembayaran')

    }
})

//order success page
app.get('/orders/success', requiredAuth, async (req,res) => {
    try{
        const {order_id} = req.query
        console.log('searching order with order id', order_id)

        let order = await Order.findOne({
            where:{
                xendit_invoice_id : order_id
            }, include: 
            [
                {
                    model:Event,
                    include: [{model:User, attributes: ['id', 'name', 'email', 'phone']}]
                },
                {
                    model: Ticket
                }
            ]
        })

        //jika tidak ditemukan coba dengan dengan external_id field
        if(!order){
            console.log('Trying to find by external id field')
            order = await Order.findOne({
                where:{
                    external_id : order_id
                },
                include:[
                    {
                        model: Event,
                        include: [{model:User, attributes: ['id', 'name', 'email', 'phone']}]
                    },
                    {
                        model:Ticket
                    }
                ]
            })
        }

        if(!order){
            return res.status(404).send('Pesanan tidak ditemukan')
        }

        //update status
        if(order.status === 'pending'){
            await order.update({status: 'paid'})
            console.log('Update order status to paid')
        }
        res.render('orders/success', {
            user: req.session.user,
            order: order,
            message: "Pembayaran berhasil!"
        })

}catch(error){
    console.error('Success page error', error);
    res.status(500).render('error',{
        message: 'Terjadi Kesalahan',
        error: error.message
    })

    }

})

//end order success page


//failed page
app.get('/orders/failed', requiredAuth, async (req,res)=>{
    try{
        const {order_id} = req.query
        const order = await Order.findOne({
            where: {
                xendit_invoice_id : order_id
            },
            include : [{model: Event}]
        })

        if(order && order.status === 'pending'){
            await order.update({status: 'failed'})

            const event = await Event.findByPk(order.event_id)
            await event.update({
                available_tickets: event.available_tickets + order.quantity
            })
        }

        res.render('orders/failed', {
            user: req.session.user,
            order: order,
            message: 'Pembayaran Gagal atau Dibatalkan'
        })
    }catch(error){
        console.error('Failed Page error', error)
        res.status(500).render('error', "Terjadi kesalahan")
    }
})
//end failed page

//profile page
app.get('/profile', requiredAuth, async(req,res) => {
    try{
        const user = await User.findByPk(req.session.user.id)
        const userOrders = await Order.count({where : {user_id : req.session.user.id}})
        const userEvent = await Event.count({where : {creator_id : req.session.user.id}})
        
        res.render('users/profile', {
            user: req.session.user,
            userData: user,
            stats: {
                orders: userOrders,
                events: userEvent
            },
            errors: []
        }) 
    }catch(error){
        console.error(error);
        res.status(500).send('Server Error');
    }

})
//end profile


//profile update
app.post('/profile', requiredAuth, async (req,res) => {
    try{
        const {name,phone} = req.body;
        await User.update(
            {name, phone},
            {where: {id: req.session.user.id}}
        )

        req.session.user.name = name
        res.redirect('/profile')

    }catch(error){
        console.error(error)
        const user = await User.findByPk(req.session.user.id)
        const userOrders = await Order.count({where : {user_id : req.session.user.id}})
        const userEvent = await Event.count({where : {creator_id : req.session.user.id}})
        res.render('users/profile', {
                user: req.session.user,
                userData: user,
                stats: {
                    orders: userOrders,
                    events: userEvent
                },
                errors: ['Terjadi Kesalahan saat update profile']
            }) 
    }


})


// Halaman "Pesanan Saya". requiredAuth menghentikan request jika pengguna belum login.
app.get('/my-orders', requiredAuth, async(req,res) => {
    try{
        // Saat login berhasil, route /login menyimpan { id, name, email, role }
        // ke req.session.user. Jadi .id di sini adalah ID user di tabel users,
        // bukan ID session/cookie browser.
        //
        // Debug: pasang breakpoint di sini atau cek req.session.user.id.
        // Jika nilainya undefined, periksa proses login dan requiredAuth.
        const orders = await Order.findAll({
            // user_id pada tabel orders menjadi filter supaya user hanya melihat
            // pesanannya sendiri (user_id harus sama dengan users.id).
            where: {user_id: req.session.user.id},
            // Minta Sequelize mengambil Event terkait untuk setiap Order.
            // Ini bisa dilakukan karena relasi Order.belongsTo(Event) di atas
            // mendefinisikan event_id sebagai foreign key.
            include: [Event],
            // Urutkan berdasarkan waktu pembuatan pesanan, yang terbaru dulu.
            order: [['created_at', 'DESC']]
        })

        // Debug: jika orders.length === 0, query berhasil tetapi belum ada
        // pesanan untuk user ini. Jika data Event kosong, periksa event_id dan relasi.
        // Hindari mencetak password, cookie, atau seluruh session ke log.
        //
        // Kirim hasil query ke template. Di EJS, data ini tersedia sebagai
        // `user` dan `orders` (misalnya orders[0].Event untuk acara pesanan pertama).
        // Nama view harus cocok dengan file di folder views.
        res.render('orders/my-orders', {
            user: req.session.user,
            orders
        })
    }catch(error){
        // Lihat pesan error di terminal server: bisa berasal dari query database
        // atau nama/path template yang tidak ditemukan.
        console.log(error);
        res.status(500).send('Server Error')
    }
})
//end profile update

//order detail

app.get('/orders/:id', requiredAuth, async (req, res)=> {
    try{
        const order = await Order.findOne({
            where:{
                id: req.params.id,
                user_id: req.session.user.id
            },
            include: [
                {
                    model: Event,
                    include: [{model:Category}]
                },
                {model: Ticket}
            ]
        })

        if(!order){
            return res.status(404).render('error', {message: 'Order tidak ditemukan'})
        }

        res.render('orders/detail', {
            user: req.session.user,
            order: order
        })
    }catch(error){
        console.error('Order detail error', error)
        res.status(500).render('error', {message: 'Terjadi kesalahan'})
    }
})

//end order detail


//ticket detail
app.get('/tickets/:ticket_code', requiredAuth, async (req,res) => {
    try{
        const ticket = await Ticket.findOne( 
            {
            include: 
            {
                ticket_code : req.params.ticket_code
            },
            include: [ 
                {
                    model: Order,
                    where: {user_id : req.session.user.id},
                    include: [
                        {
                            model: Event,
                            include: [
                                {model: Category},
                                {modell: User, attributes: ['id', 'name', 'email', 'phone']} //tambah phone disini
                            ]
                        }
                    ]
                }
            ]
        })

        if(!ticket){
            return res.status(400).render('error', {
                message: 'Tiket tidak ditemukan',
                error: `Tiket dengan kode ${req.params.ticket_code} tiket ditemukan`
            })
        }

        const qr = require('qr-image')
        const qr_svg = qr.imageSync(ticket.ticket_code, {type: 'svg'})
        const qr_code = qr_svg.toString('base64')

        res.render('tickets/detail', {
            user: req.session.user,
            ticket: ticket,
            qr_code : qr_code
        })

    }catch(error){
        res.status(500).render('error', {
            message: 'Terjadi kesalahan',
            error: error.message
        })
    }

})


 

//Helper func untuk gambar kota
app.locals.getCityImage = (city) => {
    const cityImages = {
        'Jakarta': 'https://images.unsplash.com/photo-1635924201021-e8ae80c2bdc0?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bW9uYXN8ZW58MHx8MHx8fDA%3D',
        'Bandung': 'https://images.unsplash.com/photo-1747639516590-f95c632045e9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YmFuZHVuZ3xlbnwwfHwwfHx8MA%3D%3D',
        'Surabaya': 'https://images.unsplash.com/photo-1566176553949-872b2a73e04e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c3VyYWJheWF8ZW58MHx8MHx8fDA%3D',
    };
    return cityImages[city] || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bm90JTIwZm91bmQlMjA0MDR8ZW58MHx8MHx8fDA%3D'
}

//Webhook config
app.get('/webhook/xendit', (req,res) => {
    res.json({
        message: 'Webhook endpoint is active...',
        status: 'active',
        timestamps: new Date().toISOString()
    })
})

// webhook log
app.post('/webhook/xendit', express.json(), async (req, res) =>{
    let webhookData = req.body
    let logEntry

    try{
        const signature = req.headers['x-callback-token'];
        const webhookId = req.headers['webhook-id'] || `webhook-${Date.now()}`


        console.log("===== XENDiT WEBHOOK RECEIVED ===")
        console.log("Webhook ID :", webhookId)
        console.log("SIGNATURE :", signature ? 'Yes' : 'No')
        console.log("Webhook Event: ", webhookData.event)
        console.log("Invoice ID: ", webhookData.data?.id || webhookData.id)


        logEntry = await XenditWebhookLog.create({
            webhook_id: webhookId,
            event: webhookData.event,
            invoice_id: webhookData.data?.id || webhookData.id,
            external_id: webhookData.data?.external_id || webhookData.external_id,
            status: webhookData.data?.status || webhookData.status,
            amount: webhookData.data?.amount || webhookData.amount,
            payment_method: webhookData.data?.payment_method || webhookData.payment_method,
            payment_channel: webhookData.data?.payment_channel || webhookData.payment_channel,
            currency: webhookData.data?.currency || webhookData.currency,
            received_data: JSON.stringify(webhookData),
            headers: JSON.stringify(req.headers),
            processed: false
        })  

        console.log(`Webhook log saved with id ${logEntry.id}`)
    
        //process berdasakrna event type

        let processingResult;

        switch(webhookData.event){
            case 'invoice.paid':
                processingResult = await handleInvoicePaid(webhookData.data, logEntry.id);
                break;
            case 'invoice.expired':
                processingResult = await handleInvoiceExpired(webhookData.data, logEntry.id);
                break;
            case 'invoice.failed':
                processingResult = await handleInvoiceFailed(webhookData.data, logEntry.id);
                break;
            case 'payment.succeeded':
                processingResult = await handlePaymentSucceeded(webhookData.data, logEntry.id);
                break;
            case 'payment.failed':
                processingResult = await handlePaymentFailed(webhookData.data, logEntry.id);
                break;
            
            default:
                processingResult = {
                    success: true,
                    message: `Event ${webhookData.event} tidak diproses`
                }
        }

        await logEntry.update({
            processed: processingResult.success,
            processing_error : processingResult.success ? null: processingResult.message,
            status: processingResult.updatedStatus || webhookData?.status
        })

        console.log(`Webhook processing completed : ${processingResult.message}`)

        res.status(200).json({
            success: true,
            message: 'webhook processed successfully',
            log_id: logEntry.id,
            event: webhookData.event
        })
    }catch(error){
        console.error("=== WEBHOOK PROCESSING ERROR ===")
        console.error("ERROR", error.message)

        if(logEntry){
            await logEntry.update({
                processed: false,
                processing_error: error.message
            })
        }

        res.status(500).json({
            success: false,
            message: "Webhook processing failed",
            error: error.message
        })
    }
})
//webhook log


//func handle invoice

async function handleInvoicePaid(invoiceData, logId) {
    try{
        console.log(`Processing paid invoice: `, invoiceData)

        if(!invoiceData || ! invoiceData.id){
            throw new Error('Invalid invoice data')
        }

        const order = await Order.findOne({
            where: {xendit_invoice_id: invoiceData.id}
        })

        if(!order){
            throw new Error(`Order not found for invoice : ${invoiceData.id}`)
        }

        await order.update({status: 'paid'})
        console.log(`Order ${order.id} marked as PAID`)

        return{
            success: true,
            message: `Invoce ${invoiceData.id} paid successfully`,
            updatedStatus: 'PAID'
        }
    }catch(error){
        console.error('Error in handleInvoicePaid', error)
        return{
            success: false,
            message: error.message
        }
    }
    
    
}


async function handleInvoiceExpired(invoiceData, logId) {
    try{
        console.log(`Processing expired invoice: `, invoiceData)

        if(!invoiceData || ! invoiceData.id){
            throw new Error('Invalid invoice data')
        }

        const order = await Order.findOne({
            where: {xendit_invoice_id: invoiceData.id},
            include: [{ model: Event}]
        })

        if(!order){
            throw new Error(`Order not found for invoice : ${invoiceData.id}`)
        }

        await order.update({status: 'expired'})
        console.log(`Order ${order.id} marked as EXPIRED`)

        if(order.Event){
            await order.Event.increment('available_tickets', {by: order.quantity})
            console.log(`returned ${order.quantity} tickets`)
        }


        console.log(`Order ${order.id} marked as expired`)
        return{
            success: true,
            message: `Invoce ${invoiceData.id} expired, ticket returned`,
            updatedStatus: 'EXPIRED'
        }
    }catch(error){
        console.error('Error in handleInvoiceExpired', error)
        return{
            success: false,
            message: error.message
        }
    }
    
    
}

async function handleInvoiceFailed(invoiceData, logId) {
    try{
        console.log(`Processing failed invoice: `, invoiceData)

        if(!invoiceData || ! invoiceData.id){
            throw new Error('Invalid invoice data')
        }

        const order = await Order.findOne({
            where: {xendit_invoice_id: invoiceData.id},
            include: [{ model: Event}]
        })

        if(!order){
            throw new Error(`Order not found for invoice : ${invoiceData.id}`)
        }

        await order.update({status: 'failed'})
        console.log(`Order ${order.id} marked as EXPIRED`)

        if(order.Event){
            await order.Event.increment('available_tickets', {by: order.quantity})
            console.log(`returned ${order.quantity} tickets`)
        }


        console.log(`Order ${order.id} marked FAILED`)
        return{
            success: true,
            message: `Invoce ${invoiceData.id} failed`,
            updatedStatus: 'FAILED'
        }
    }catch(error){
        console.error('Error in handleInvoiceFailed', error)
        return{
            success: false,
            message: error.message
        }
    }
    
    
}

async function findOrderForPayment(paymentData) {
    const orderConditions = []

    if(paymentData.invoice_id){
        orderConditions.push({xendit_invoice_id: paymentData.invoice_id})
    }
    if(paymentData.reference_id){
        orderConditions.push({external_id: paymentData.reference_id})
    }
    if(paymentData.external_id){
        orderConditions.push({external_id: paymentData.external_id})
    }

    if(orderConditions.length === 0){
        throw new Error('Payment data does not contain an order reference')
    }

    return Order.findOne({
        where: {[Op.or]: orderConditions},
        include: [{model: Event}]
    })
}

async function handlePaymentSucceeded(paymentData, logId){
    try{
        console.log(`Processing Payment Succeeded: `, paymentData)

        if(!paymentData){
            throw new Error('Invalid Payment Data')
        }

        const order = await findOrderForPayment(paymentData)

        if(!order){
            console.log('Order not found for payment data')
            return{
                success: false,
                message: 'Order not found for payment data'
            }
        }

        if(order.status === 'pending'){
            await order.update({status: 'paid'})
            console.log(`Order ${order.id} marked as PAID`)
        }

        return{
            success: true,
            message: `Payment succeeded for order ${order.id}`,
            updatedStatus: order.status === 'pending' ? 'PAID' : order.status.toUpperCase()
        }
    }catch(error){
        console.error("Error in handlePaymentSucceeded: ", error)
        return{
            success: false,
            message: error.message
        }
    }   
}

async function handlePaymentFailed(paymentData, logId){
    try{
        console.log('Processing Payment Failed: ', paymentData)

        if(!paymentData){
            throw new Error('Invalid Payment Data')
        }

        const order = await findOrderForPayment(paymentData)

        if(!order){
            return{
                success: false,
                message: 'Order not found for payment data'
            }
        }

        if(order.status === 'pending'){
            await order.update({status: 'failed'})
            if(order.Event){
                await order.Event.increment('available_tickets', {by: order.quantity})
                console.log(`Returned ${order.quantity} tickets for order ${order.id}`)
            }
        }

        return{
            success: true,
            message: `Payment failed for order ${order.id}`,
            updatedStatus: order.status === 'pending' ? 'FAILED' : order.status.toUpperCase()
        }
    }catch(error){
        console.error('Error in handlePaymentFailed: ', error)
        return{
            success: false,
            message: error.message
        }
    }
}
// Sinkronisasi normal memeriksa tabel tanpa mengubah index berulang kali.
// gunakan .sync({ alter: true }) untuk membuat Sequelize terus mengubah tabel 
const syncDatabase = async () => {
 try{
    await sequelize.sync()
    console.log("All table successfully sync")
 }catch(error){
    console.log("Database fail to sync", error)
 }
}

async function startServer() {
    try{
        // Server baru dijalankan setelah koneksi dan struktur database siap.
        await sequelize.authenticate();
    await syncDatabase();
    // Callback pada `listen` baru dipanggil setelah server berhasil membuka PORT.
    app.listen(PORT, () =>{
        console.log(`Server running in http://localhost:${PORT} `)
    });
    }catch(error){
        console.log('Running failed', error)
    }
}

startServer()