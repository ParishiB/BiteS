import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createContactSchema, identifySchema } from "../utils/zod";
const prisma = new PrismaClient();

export const createContact = async (req: Request, res: Response) => {
  try {
    const result = createContactSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error.errors);
    }
    const { phoneNumber, email, linkedId, linkPrecedence } = result.data;

    const newContact = await prisma.contact.create({
      data: {
        phoneNumber: phoneNumber || null,
        email: email || null,
        linkedId: linkedId || null,
        linkPrecedence: "primary",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });

    res.status(201).json(newContact);
  } catch (error) {
    console.error("Could not create the contact", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Please go tthrought the README to ideentify what case I , case II and case III

export const identify = async (req: Request, res: Response) => {
  try {
    const result = identifySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error.errors);
    }
    const { email, phoneNumber } = result.data;
    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Email or phone number required" });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email ?? undefined },
          { phoneNumber: phoneNumber ?? undefined },
        ],
      },
    });

    // Case 1: If there is no contact, create a new contact
    if (contacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email: email ?? undefined,
          phoneNumber: phoneNumber ?? undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return res
        .status(201)
        .json({ message: "New contact created", contact: newContact });
    }

    // Identify the primary contact as the first found contact
    const primaryContact = contacts[0];
    const primaryContactId = primaryContact.id;

    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();
    const secondaryContactIds = new Set<number>();

    let createSecondaryContact = false;

    contacts.forEach((contact) => {
      if (contact.id !== primaryContactId) {
        secondaryContactIds.add(contact.id);
      }
      if (contact.email) {
        emails.add(contact.email);
      }
      if (contact.phoneNumber) {
        phoneNumbers.add(contact.phoneNumber);
      }
      // Check if the incoming request contains new information
      if (
        (email && contact.email !== email) ||
        (phoneNumber && contact.phoneNumber !== phoneNumber)
      ) {
        createSecondaryContact = true;
      }
    });

    // Ensure the primary contact's email and phone number are first in the arrays if not already included
    const emailArray = Array.from(emails);
    const phoneNumberArray = Array.from(phoneNumbers);
    if (primaryContact.email && !emailArray.includes(primaryContact.email)) {
      emailArray.unshift(primaryContact.email);
    }
    if (
      primaryContact.phoneNumber &&
      !phoneNumberArray.includes(primaryContact.phoneNumber)
    ) {
      phoneNumberArray.unshift(primaryContact.phoneNumber);
    }

    // Case 2: Create a secondary contact if new information is found
    if (createSecondaryContact) {
      const newSecondaryContact = await prisma.contact.create({
        data: {
          email: email ?? undefined,
          phoneNumber: phoneNumber ?? undefined,
          linkedId: primaryContactId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      secondaryContactIds.add(newSecondaryContact.id);

      // Add the new email or phone number to the arrays if they are provided and not already included
      if (email && !emailArray.includes(email)) {
        emailArray.push(email);
      }
      if (phoneNumber && !phoneNumberArray.includes(phoneNumber)) {
        phoneNumberArray.push(phoneNumber);
      }

      return res.status(201).json({
        message: "Secondary contact created",
        contact: {
          primaryContactId,
          emails: emailArray,
          phoneNumbers: phoneNumberArray,
          secondaryContactIds: Array.from(secondaryContactIds),
        },
      });
    }

    const response = {
      contact: {
        primaryContactId,
        emails: emailArray,
        phoneNumbers: phoneNumberArray,
        secondaryContactIds: Array.from(secondaryContactIds),
      },
    };

    // case 3 primary contacts turn into secondary
    const contactByEmail = await prisma.contact.findFirst({ where: { email } });
    const contactByPhone = await prisma.contact.findFirst({
      where: { phoneNumber },
    });

    if (!contactByEmail && !contactByPhone) {
      return { error: "No matching records found" };
    }

    const primaryC = contactByEmail || contactByPhone;
    let updatedContact;
    if (contactByEmail && contactByPhone) {
      if (contactByEmail.id !== contactByPhone.id) {
        updatedContact = await prisma.contact.update({
          where: { id: contactByPhone.id },
          data: { linkedId: contactByEmail.id, linkPrecedence: "secondary" },
        });
      }
    }

    const resp = {
      contact: {
        primaryContactId: primaryC!.id,
        emails: [contactByEmail?.email, contactByPhone?.email].filter(Boolean),
        phoneNumbers: [
          contactByEmail?.phoneNumber,
          contactByPhone?.phoneNumber,
        ].filter(Boolean),
        secondaryContactIds:
          contactByEmail && contactByPhone ? [contactByPhone.id] : [],
      },
    };

    res.status(200).json(resp);
  } catch (error) {
    console.error("Error identifying contacts", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
