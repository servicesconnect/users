import { winstonLogger, createQueueConnection } from "@users/config";
import { IBuyerDocument, ISellerDocument } from "@users/interfaces";
import { Channel, ConsumeMessage, Replies } from "amqplib";
import { Logger } from "winston";

import {
  createBuyer,
  updateBuyerPurchasedProjectsProp,
} from "@users/services/buyer.service";
import {
  getRandomSellers,
  updateSellerCancelledJobsProp,
  updateSellerCompletedJobsProp,
  updateSellerOngoingJobsProp,
  updateSellerReview,
  updateTotalProjectsCount,
} from "@users/services/seller.service";
import { publishDirectMessage } from "@users/queues";

const log: Logger = winstonLogger("usersServiceConsumer", "debug");

const consumeBuyerDirectMessage = async (channel: Channel): Promise<void> => {
  try {
    if (!channel) {
      channel = (await createQueueConnection()) as Channel;
    }
    const exchangeName = "servicesconnect-buyer-update";
    const routingKey = "user-buyer";
    const queueName = "user-buyer-queue";
    await channel.assertExchange(exchangeName, "direct");
    const servicesconnectQueue: Replies.AssertQueue = await channel.assertQueue(
      queueName,
      { durable: true, autoDelete: false }
    );
    await channel.bindQueue(
      servicesconnectQueue.queue,
      exchangeName,
      routingKey
    );
    channel.consume(
      servicesconnectQueue.queue,
      async (msg: ConsumeMessage | null) => {
        const { type } = JSON.parse(msg!.content.toString());
        if (type === "auth") {
          const { username, email, profilePicture, country, createdAt } =
            JSON.parse(msg!.content.toString());
          const buyer: IBuyerDocument = {
            username,
            email,
            profilePicture,
            country,
            purchasedProjects: [],
            createdAt,
          };
          await createBuyer(buyer);
        } else {
          const { buyerId, purchasedProjects } = JSON.parse(
            msg!.content.toString()
          );
          await updateBuyerPurchasedProjectsProp(
            buyerId,
            purchasedProjects,
            type
          );
        }
        channel.ack(msg!);
      }
    );
  } catch (error) {
    log.log(
      "error",
      "UsersService UserConsumer consumeBuyerDirectMessage() method error:",
      error
    );
  }
};

const consumeSellerDirectMessage = async (channel: Channel): Promise<void> => {
  try {
    if (!channel) {
      channel = (await createQueueConnection()) as Channel;
    }
    const exchangeName = "servicesconnect-seller-update";
    const routingKey = "user-seller";
    const queueName = "user-seller-queue";
    await channel.assertExchange(exchangeName, "direct");
    const servicesconnectQueue: Replies.AssertQueue = await channel.assertQueue(
      queueName,
      { durable: true, autoDelete: false }
    );
    await channel.bindQueue(
      servicesconnectQueue.queue,
      exchangeName,
      routingKey
    );
    channel.consume(
      servicesconnectQueue.queue,
      async (msg: ConsumeMessage | null) => {
        const {
          type,
          sellerId,
          ongoingJobs,
          completedJobs,
          totalEarnings,
          recentDelivery,
          projectSellerId,
          count,
        } = JSON.parse(msg!.content.toString());
        if (type === "create-order") {
          await updateSellerOngoingJobsProp(sellerId, ongoingJobs);
        } else if (type === "approve-order") {
          await updateSellerCompletedJobsProp({
            sellerId,
            ongoingJobs,
            completedJobs,
            totalEarnings,
            recentDelivery,
          });
        } else if (type === "update-project-count") {
          await updateTotalProjectsCount(`${projectSellerId}`, count);
        } else if (type === "cancel-order") {
          await updateSellerCancelledJobsProp(sellerId);
        }
        channel.ack(msg!);
      }
    );
  } catch (error) {
    log.log(
      "error",
      "UsersService UserConsumer consumeSellerDirectMessage() method error:",
      error
    );
  }
};

const consumeReviewFanoutMessages = async (channel: Channel): Promise<void> => {
  try {
    if (!channel) {
      channel = (await createQueueConnection()) as Channel;
    }
    const exchangeName = "servicesconnect-review";
    const queueName = "seller-review-queue";
    await channel.assertExchange(exchangeName, "fanout");
    const servicesconnectQueue: Replies.AssertQueue = await channel.assertQueue(
      queueName,
      { durable: true, autoDelete: false }
    );
    await channel.bindQueue(servicesconnectQueue.queue, exchangeName, "");
    channel.consume(
      servicesconnectQueue.queue,
      async (msg: ConsumeMessage | null) => {
        const { type } = JSON.parse(msg!.content.toString());
        if (type === "buyer-review") {
          await updateSellerReview(JSON.parse(msg!.content.toString()));
          await publishDirectMessage(
            channel,
            "servicesconnect-update-project",
            "update-project",
            JSON.stringify({
              type: "updateProject",
              projectReview: msg!.content.toString(),
            }),
            "Message sent to project service."
          );
        }
        channel.ack(msg!);
      }
    );
  } catch (error) {
    log.log(
      "error",
      "UsersService UserConsumer consumeReviewFanoutMessages() method error:",
      error
    );
  }
};

const consumeSeedProjectDirectMessages = async (
  channel: Channel
): Promise<void> => {
  try {
    if (!channel) {
      channel = (await createQueueConnection()) as Channel;
    }
    const exchangeName = "servicesconnect-project";
    const routingKey = "get-sellers";
    const queueName = "user-project-queue";
    await channel.assertExchange(exchangeName, "direct");
    const servicesconnectQueue: Replies.AssertQueue = await channel.assertQueue(
      queueName,
      { durable: true, autoDelete: false }
    );
    await channel.bindQueue(
      servicesconnectQueue.queue,
      exchangeName,
      routingKey
    );
    channel.consume(
      servicesconnectQueue.queue,
      async (msg: ConsumeMessage | null) => {
        const { type } = JSON.parse(msg!.content.toString());
        if (type === "getSellers") {
          const { count } = JSON.parse(msg!.content.toString());
          const sellers: ISellerDocument[] = await getRandomSellers(
            parseInt(count, 10)
          );
          await publishDirectMessage(
            channel,
            "servicesconnect-seed-project",
            "receive-sellers",
            JSON.stringify({ type: "receiveSellers", sellers, count }),
            "Message sent to project service."
          );
        }
        channel.ack(msg!);
      }
    );
  } catch (error) {
    log.log(
      "error",
      "UsersService UserConsumer consumeReviewFanoutMessages() method error:",
      error
    );
  }
};

export {
  consumeBuyerDirectMessage,
  consumeSellerDirectMessage,
  consumeReviewFanoutMessages,
  consumeSeedProjectDirectMessages,
};
