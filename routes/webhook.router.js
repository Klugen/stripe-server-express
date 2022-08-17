/**
 * created by hh on 2022/8/17
 */
const bodyParser = require('body-parser');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = require('express').Router();

router.post("/",bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            req.header('Stripe-Signature'),
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log(err);
        console.log(`⚠️  Webhook signature verification failed.`);
        console.log(
            `⚠️  Check the env file and enter the correct webhook secret.`
        );
        return res.sendStatus(400);
    }

    // Extract the object from the event.
    const dataObject = event.data.object;


    // https://stripe.com/docs/billing/webhooks
    switch (event.type) {
        case 'payment_intent.succeeded': { // 支付成功
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent status: ${paymentIntent.status}`);
            break;
        }
        case 'payment_intent.payment_failed': { //支付失败
            const paymentIntent = event.data.object;
            console.log(
                `❌ Payment failed: ${paymentIntent.last_payment_error?.message}`
            );
            break;
        }
        case 'charge.succeeded': { //账户充值成功 --用户支付成功后会触发该事件
            const charge = event.data.object;
            console.log(`Charge id: ${charge.id}`);
            break;
        }
        case 'invoice.payment_succeeded': // 订阅支付成功
            if(dataObject['billing_reason'] == 'subscription_create') {
                const subscription_id = dataObject['subscription']
                const payment_intent_id = dataObject['payment_intent']
                const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id);

                try {
                    //  跟新订阅信息，将订阅信息的支付方式设置为支付方式，下次自动从次支付方式支付
                    const subscription = await stripe.subscriptions.update(
                        subscription_id,
                        {
                            default_payment_method: payment_intent.payment_method,
                        },
                    );

                    console.log("Default payment method set for subscription:" + payment_intent.payment_method);
                } catch (err) {
                    console.log(err);
                    console.log(`⚠️  Falied to update the default payment method for subscription: ${subscription_id}`);
                }
            };

            break;
        case 'invoice.payment_failed':
            // If the payment fails or the customer does not have a valid payment method,
            //  an invoice.payment_failed event is sent, the subscription becomes past_due.
            // Use this webhook to notify your user that their payment has
            // failed and to retrieve new card details.
            break;
        case 'invoice.finalized':
            break;
        case 'customer.subscription.deleted':
            if (event.request != null) {
                // handle a subscription cancelled by your request
                // from above.
            } else {
                // handle subscription cancelled automatically based
                // upon your subscription settings.
            }
            break;
        case 'customer.subscription.trial_will_end': // 试用期结束
            // Send notification to your user that the trial will end
            break;
        default:
        // Unexpected event type
    }
    res.sendStatus(200);
});

module.exports = router;
