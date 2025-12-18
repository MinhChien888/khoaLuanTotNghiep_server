const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');

app.use(cors());
app.options('*', cors())
const stripeRoutes = require('./routes/stripe.js');
app.use("/api/stripe/webhook", stripeRoutes);

//middleware
app.use(bodyParser.json());
app.use(express.json());


//Routes
const userRoutes = require('./routes/user.js');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const imageUploadRoutes = require('./helper/imageUpload.js');
const productReviews = require('./routes/productReviews.js');
const cartSchema = require('./routes/cart.js');
const myListSchema = require('./routes/myList.js');
const ordersSchema = require('./routes/orders.js');
const homeBannerSchema = require('./routes/homeBanner.js');
const searchRoutes = require('./routes/search.js');
const bannersSchema = require('./routes/banners.js');
const homeSideBannerSchema = require('./routes/homeSideBanner.js');
const homeBottomBannerSchema = require('./routes/homeBottomBanner.js');
const checkoutSchema = require('./routes/checkout.js');
const addressRoutes = require("./routes/address");


app.use("/api/user",userRoutes);
app.use("/uploads",express.static("uploads"));
app.use(`/api/category`, categoryRoutes);
app.use(`/api/products`, productRoutes);
app.use(`/api/imageUpload`, imageUploadRoutes);
app.use(`/api/productReviews`, productReviews);
app.use(`/api/cart`, cartSchema);
app.use(`/api/my-list`, myListSchema);
app.use(`/api/orders`, ordersSchema);
app.use(`/api/homeBanner`, homeBannerSchema);
app.use(`/api/search`, searchRoutes);
app.use(`/api/banners`, bannersSchema);
app.use(`/api/homeSideBanners`, homeSideBannerSchema);
app.use(`/api/homeBottomBanners`, homeBottomBannerSchema);
app.use(`/api/checkout`, checkoutSchema);
app.use("/api/stripe", stripeRoutes);
app.use("/api/addresses", addressRoutes);




//Database
mongoose.connect(process.env.CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('Kết nối với Databae...');
        //Server
        app.listen(process.env.PORT, () => {
            console.log(`Server đang chạy tại http://localhost:${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log(err);
    })
