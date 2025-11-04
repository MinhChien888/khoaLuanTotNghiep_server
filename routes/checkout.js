
const { Order } =  require('../models/orders');
const express = require("express");
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Product } = require("../models/products");




router.post('/', async(req, res)=>{
    const products = req.body.products;
    
    const lineItems = products.map((product)=>({
        price_data: {
            currency: "usd",
            product_data:{
                name: product.productTitle?.substr(0,30)+'...',

            },
            unit_amount: product.price * 100,
        },
        quantity: product.quantity
    }));

    const customer =  await stripe.customers.create({
        metadata:{
            userId:req.body.userId,
            cart:JSON.stringify(lineItems)

        }
    })

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer:customer.id,
        line_items: lineItems,
        mode:"payment",
        shipping_address_collection:{
            allowed_countries:['US', 'VN']
        },
        success_url:`${process.env.CLIENT_BASE_URL}/payment/complete/{CHECK_SESSION_ID}`,
        cancel_url: "http://localhost:3008/cancel",
    });
    res.json({ id: session.id})
});

router.get('/payment/complete', async(req, res)=>{
    const result = Promise.all([
        stripe.checkout.session.retries(req.query.session_id,{ expand:['payment_intent.payment_method']}),
        stripe.checkout.sessions.listLineItems(req.query.session_id)
    ])
    res.status(200).send(JSON.stringify(await result))
})

router.get('/cancel',(req, res)=>{
    res.redirect('/')
})
module.exports = router;