import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createContactSchema, identifySchema } from "../utils/zod";
const prisma = new PrismaClient();

export const identify = async (req: Request, res: Response) => {
  try {
    const result = identifySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error.errors);
    }

    const { email, phoneNumber } = result.data;
    if (!email && !phoneNumber) {
      const newContact = await prisma.contact.create({
        data: {
          phoneNumber: phoneNumber || null,
          email: email || null,
          linkedId: null,
          linkPrecedence: "primary",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      });
      return res.status(400).json({
        message:
          "new contact is created since email and phoneNumber are not provided",
      });
    }

    // Case II
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email ?? undefined },
          { phoneNumber: phoneNumber ?? undefined },
        ],
      },
    });

    // Case III

    const primaryContact = contacts[0];
    const primaryContactId = primaryContact.id;
    let emails: any = [];
    let phoneNumbers: any = [];
    let secondaryContactIds: any = [];

    for (let i = 1; i < contacts.length; i++) {
      await prisma.contact.update({
        where: {
          id: contacts[i].id,
        },
        data: {
          linkedId: primaryContactId,
          linkPrecedence: "secondary",
          updatedAt: new Date(),
        },
      });
      emails.push(contacts[i].email);
      phoneNumbers.push(contacts[i].phoneNumber);
      secondaryContactIds.push(contacts[i].id);
    }

    if (emails.length > 1 || phoneNumbers.length > 1) {
      return res.status(200).json({
        contact: {
          primaryContactId: primaryContactId,
          emails: emails,
          phoneNumbers: phoneNumbers,
          secondaryContactIds: secondaryContactIds,
        },
      });
    }

    if (contacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email: email ?? undefined,
          phoneNumber: phoneNumber ?? undefined,
          linkPrecedence: "primary",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return res
        .status(201)
        .json({ message: "New contact created", contact: newContact });
    }

    // Case IV

    let firstContactWithEmail = await prisma.contact.findFirst({
      where: {
        email: email,
      },
    });

    let firstContactWithPhoneNumber = await prisma.contact.findFirst({
      where: {
        phoneNumber: phoneNumber,
      },
    });

    let id1Value: any = firstContactWithEmail?.id;
    let id2Value: any = firstContactWithPhoneNumber?.id;

    if (id1Value !== undefined && id2Value !== undefined) {
      if (id1Value > id2Value) {
        await prisma.contact.update({
          where: {
            id: id2Value,
          },
          data: {
            linkedId: id1Value,
            linkPrecedence: "secondary",
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.contact.update({
          where: {
            id: id1Value,
          },
          data: {
            linkedId: id2Value,
            linkPrecedence: "secondary",
            updatedAt: new Date(),
          },
        });
      }
      return res.status(200).json({ message: "Case 4 satisfied" });
    } else {
      return res.status(400).json({
        message: "Cannot update contacts. One or both IDs are undefined.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
