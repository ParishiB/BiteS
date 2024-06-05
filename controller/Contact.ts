import { Request, Response } from "express";
import { PrismaClient, Contact } from "@prisma/client";
import { identifySchema } from "../utils/zod";

const prisma = new PrismaClient();

export const identify = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    // Zod for input validation

    const parsedData = identifySchema.safeParse(req.body);

    if (!parsedData.success) {
      return res.status(400).json({ error: parsedData.error.errors });
    }

    // **********************************************************************************************

    const findEmail: any = await prisma.contact.findFirst({
      where: {
        email: email,
      },
    });
    const findPhone: any = await prisma.contact.findFirst({
      where: {
        phoneNumber: phoneNumber,
      },
    });

    // **********************************************************************************************

    // CASE - 1 If none of the the phonenumber or email is not present in db, so a new row will be created

    if (!findEmail && !findPhone) {
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
      return res.status(200).json(newContact);
    }
    // **********************************************************************************************

    //  CASE - 2 if either of the phone number or email is present so we create a new row and send thee response iwth all the primarycontactt

    // ***************CONDITION 1********************** //

    if (findEmail && !findPhone) {
      const newContact = await prisma.contact.create({
        data: {
          phoneNumber: phoneNumber || null,
          email: email || null,
          linkedId: findEmail.linkedId || findEmail.id,
          linkPrecedence: "secondary",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      });

      let phones: string[] = [];
      let secondaryContacts: number[] = [];

      const allContacts = await prisma.contact.findMany({
        where: {
          linkedId: findEmail.id,
        },
      });

      allContacts.forEach((contact) => {
        if (contact.phoneNumber) {
          phones.push(contact.phoneNumber);
        }
        if (contact.id) {
          secondaryContacts.push(contact.id);
        }
      });

      const contact = {
        primaryContactId: findEmail.id,
        email,
        phoneNumbers: phones,
        secondaryContactIds: secondaryContacts,
      };

      return res.status(200).json(contact);
    }
    // ***************CONDITION 2********************** //

    if (!findEmail && findPhone) {
      const newContact = await prisma.contact.create({
        data: {
          phoneNumber: phoneNumber || null,
          email: email || null,
          linkedId: findPhone.linkedId || findPhone.id,
          linkPrecedence: "secondary",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      });

      let emails: string[] = [];

      let secondaryContacts: number[] = [];

      const allContacts = await prisma.contact.findMany({
        where: {
          linkedId: findPhone.id,
        },
      });

      allContacts.forEach((contact) => {
        if (contact.email) {
          emails.push(contact.email);
        }
        if (contact.id) {
          secondaryContacts.push(contact.id);
        }
      });

      const contact = {
        primaryContactId: findPhone.id,
        emails: emails,
        phoneNumber,
        secondaryContactIds: secondaryContacts,
      };

      return res.status(200).json(contact);
    }
    // **********************************************************************************************

    // CASE - 3 if we want to change the primary contact to secondary contact

    if (
      findEmail.linkPrecedence === "primary" &&
      findPhone.linkPrecedence === "primary"
    ) {
      if (findEmail.id > findPhone.id) {
        const updatedContact = await prisma.contact.update({
          where: {
            id: findEmail.id,
          },
          data: {
            linkPrecedence: "secondary",
            linkedId: findPhone.id,
          },
        });

        let emails: string[] = [];
        let phones;
        let secondaryContacts: number[] = [];

        const allContacts = await prisma.contact.findMany({
          where: {
            linkedId: findPhone.id,
          },
        });

        allContacts.forEach((contact) => {
          if (contact.email) {
            emails.push(contact.email);
          }
          if (contact.phoneNumber) {
            phones = contact.phoneNumber;
          }
          if (contact.id) {
            secondaryContacts.push(contact.id);
          }
        });

        const contact = {
          primaryContactId: findPhone.id,
          emails: emails,
          phoneNumber,
          secondaryContactIds: secondaryContacts,
        };

        return res.status(200).json({ contact });
      }

      if (findEmail.id < findPhone.id) {
        const updatedContact = await prisma.contact.update({
          where: {
            id: findPhone.id,
          },
          data: {
            linkPrecedence: "secondary",
            linkedId: findEmail.id,
          },
        });

        let phones: string[] = [];
        let secondaryContacts: number[] = [];

        const allContacts = await prisma.contact.findMany({
          where: {
            linkedId: findEmail.id,
          },
        });

        allContacts.forEach((contact) => {
          if (contact.phoneNumber) {
            phones.push(contact.phoneNumber);
          }
          if (contact.id) {
            secondaryContacts.push(contact.id);
          }
        });

        const contact = {
          primaryContactId: findEmail.id,
          email,
          phoneNumbers: phones,
          secondaryContactIds: secondaryContacts,
        };

        return res.status(200).json({ contact });
      }
    }

    // CASE - 4 both the email and phoneNumber are present in the same row

    const findContactId = await prisma.contact.findFirst({
      where: {
        AND: [{ email: email }, { phoneNumber: phoneNumber }],
      },
    });

    let emails: string[] = [];
    let phones: string[] = [];
    let secondaryContacts: number[] = [];

    if (findContactId) {
      const contacts = await prisma.contact.findMany({
        where: {
          linkedId: findContactId.id,
        },
      });

      contacts.forEach((contact) => {
        if (contact.email) emails.push(contact.email);
        if (contact.phoneNumber) phones.push(contact.phoneNumber);
        secondaryContacts.push(contact.id);
      });

      const contactResponse = {
        primaryContactId: findContactId.id,
        emails,
        phones,
        secondaryContactIds: secondaryContacts,
      };

      return res.status(200).json({ contactResponse });
    }

    return res.status(404).json({ message: "Contact not found" });

    // **********************************************************************************************
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
