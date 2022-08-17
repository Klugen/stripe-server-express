/**
 * created by hh on 2022/8/17
 */

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = require('express').Router();

const calculateOrderAmount = (items) => {
    return 3000;
};

/**
 * 创建订单支付参数给前台用于完成支付
 */

router.post('/create-payment-intent', async (req, res) => {
    // todo 根据传回的信息计算价格 此处的价格为*100后的数 。比如10.99美元，此处应为1099
    const { items } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "gbp",
        payment_method_types: ["card",'alipay','wechat_pay'],
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

/**
 * 指定退款金额退款
 */
router.post("/online-payment-refund-spec-amount" , async (req, res) => {
    const { orderid,refundAmount } = req.body;
    try {
        const refund = await stripe.refunds.create({
            payment_intent: orderid,// 'pi_3LVA1fB1C7kD4JgB03AxmSGQ',
            amount: refundAmount, //    退款金额
        });
        res.send(JSON.stringify(refund));
    }catch (err){
        res.send(err);
    }
}) ;

/**
 * 订单全额退款
 */
router.post("/online-payment-refund" , async (req, res) => {
    const { orderid } = req.body;
    try {
        const refund = await stripe.refunds.create({
            payment_intent: orderid,// 'pi_3LVA1fB1C7kD4JgB03AxmSGQ',

        });
        res.send(JSON.stringify(refund));
    }catch (err){
        res.send(err);
    }
}) ;


module.exports = router;
