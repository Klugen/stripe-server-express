/**
 * created by hh on 2022/8/17
 */

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = require('express').Router();

router.get('/config', async (req, res) => {
    //获取所有产品列表
    const prices = await stripe.prices.list({
        //lookup_keys: ['sample_basic', 'sample_premium'], //根据产品名称过滤
        expand: ['data.product']
    });
    console.log(prices);
    res.send({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        prices: prices.data,
    });
});

/**
 * 创建用户
 */
router.post('/create-customer', async (req, res) => {
    const customer = await stripe.customers.create({
        email: req.body.email,
    });
    // Save the customer.id in your database alongside your user.
    // We're simulating authentication with a cookie.
    res.cookie('customer', customer.id, { maxAge: 900000, httpOnly: true });

    res.send({ customer: customer });
});

/**
 * 创建订阅订单
 * 获取订阅以后，具体的支付由前台直接调取
 */
router.post('/create-subscription', async (req, res) => {
    const customerId = req.cookies['customer'];
    const priceId = req.body.priceId;
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{
                price: priceId,
            }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });
        res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (error) {
        return res.status(400).send({ error: { message: error.message } });
    }
});

/**
 * 取消订阅
 *
 * 取消后，不回触发退款，只是下一周期订阅不再支付
 */
router.post('/cancel-subscription', async (req, res) => {

    try {
        const deletedSubscription = await stripe.subscriptions.del(
            req.body.subscriptionId
        );

        res.send({ subscription: deletedSubscription });
    } catch (error) {
        return res.status(400).send({ error: { message: error.message } });
    }
});

/***
 * 更新订阅
 */
router.post('/update-subscription', async (req, res) => {
    try {
        //根据订阅订单，获取订阅
        const subscription = await stripe.subscriptions.retrieve(
            req.body.subscriptionId
        );
        const newPriceId = req.body.newPriceId;
        const updatedSubscription = await stripe.subscriptions.update(
            req.body.subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPriceId , //需要更新成新的订阅
                }],
            }
        );

        res.send({ subscription: updatedSubscription });
    } catch (error) {
        return res.status(400).send({ error: { message: error.message } });
    }
});

//获取用户所有订阅列表
router.get('/subscriptions', async (req, res) => {
    // Simulate authenticated user. In practice this will be the
    // Stripe Customer ID related to the authenticated user.
    const customerId = req.cookies['customer'];

    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
    });

    res.json({subscriptions});
});

module.exports = router;
