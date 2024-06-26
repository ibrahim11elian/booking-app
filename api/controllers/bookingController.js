/* eslint-disable no-undef */
import Stripe from 'stripe';
import TourModel from '../models/tourModel.js';
import UserModel from '../models/userModel.js';
import AppError from '../utils/error.js';
import BookingModel from '../models/bookingModel.js';
import BaseController from './baseController.js';
class BookingController extends BaseController {
  constructor() {
    super(BookingModel);
  }

  createBooking = this.createOne;

  getAllBookings = this.getAll;

  getBooking = this.getOne();

  updateBooking = this.updateOne;

  deleteBooking = this.deleteOne;

  setQuery = (req, res, next) => {
    // This middleware is for allowing to get tour bookings or user bookings using nested routes
    if (req.params.tourId)
      (req.query.tour = req.params.tourId), (req.body.tour = req.params.tourId);
    if (req.params.userId)
      (req.query.user = req.params.userId), (req.body.user = req.params.userId);

    next();
  };

  checkTourSoldOut = async (req, res, next) => {
    const { tour, tourDate } = req.body;
    try {
      // check the tour if it's sold out
      if (await TourModel.checkTourStatus(tour, tourDate)) {
        next(new AppError('This tour is sold out on this date', 400));
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  getCheckoutSession = async (req, res, next) => {
    try {
      const { tourId } = req.params;
      const { tourDate } = req.body;

      if (!tourDate) {
        return next(new AppError('You have to add the tour date', 400));
      }

      const tour = await TourModel.findById(tourId);

      if (!tour) {
        return next(new AppError('This tour does not exist!', 404));
      }

      if (!tour.startDates.includes(new Date(tourDate).toString())) {
        return next(
          new AppError(
            'Tour date is not available, please choose a valid tour date',
            400,
          ),
        );
      }

      // check the tour if it's sold out
      if (await BookingModel.checkTourStatus(tour, tourDate)) {
        next(new AppError('This tour is sold out on this date', 400));
      }

      const session = await new Stripe(
        process.env.STRIPE_KEY,
      ).checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/`,
        cancel_url: `${req.protocol}://${req.get('host')}/api/v1/tours/${tourId}`,
        customer_email: req.user.email,
        client_reference_id: tourId,
        metadata: {
          tourDate,
        },
        mode: 'payment',
        line_items: [
          {
            price_data: {
              product_data: {
                name: tour.name,
                description: tour.description,
                images: [tour.imageCover],
              },
              currency: 'usd',
              unit_amount: tour.price * 100,
            },

            quantity: 1,
          },
        ],
      });

      res.status(200).json({
        status: 'success',
        session,
      });
    } catch (error) {
      next(error);
    }
  };

  webhookCheckout = async (req, res, next) => {
    const stripe = new Stripe(process.env.STRIPE_KEY);
    const signature = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.WEBHOOK_SECRET,
      );

      if (event.type === 'checkout.session.completed') {
        await this.createBookingCheckout(event.data.object);
      }

      res.status(200).json({
        received: true,
      });
    } catch (error) {
      next(error);
    }
  };

  createBookingCheckout = async (session) => {
    const tourId = session.client_reference_id;
    const userEmail = session.customer_email;
    const { tourDate } = session.metadata;
    const price = session.amount_total / 100;
    const paid = true;
    // const paymentMethod = session.payment_method_types[0];
    // const paymentStatus = session.payment_status;
    // const paymentDate = session.payment_created;

    const user = await UserModel.findOne({ email: userEmail });
    const tour = await TourModel.findById(tourId);

    if (!tour || !user) return;

    await BookingModel.create({
      tour: tourId,
      user: user.id,
      price,
      tourDate,
      paid,
    });
  };
}

export default BookingController;
