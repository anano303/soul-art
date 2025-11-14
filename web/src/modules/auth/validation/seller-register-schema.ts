import * as z from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_VALIDATION_MESSAGE =
  "სლაგი უნდა შედგებოდეს 3-40 სიმბოლოსგან (პატარა ლათინური ასოები, ციფრები და ჰიფენი)";

export const sellerRegisterSchema = z.object({
  storeName: z.string().min(1, "მაღაზიის სახელი სავალდებულოა"),
  // Remove storeLogo since we'll handle it as a file upload
  ownerFirstName: z.string().min(1, "სახელი სავალდებულოა"),
  ownerLastName: z.string().min(1, "გვარი სავალდებულოა"),
  phoneNumber: z
    .string()
    .regex(/^\+995\d{9}$/, "ტელეფონის ნომერი უნდა იყოს +995 ფორმატში"),
  email: z.string().email("არასწორი ელ-ფოსტის ფორმატი"),
  password: z
    .string()
    .min(6, "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს")
    .max(20, "პაროლი არ უნდა აღემატებოდეს 20 სიმბოლოს"),
  identificationNumber: z
    .string()
    .length(11, "პირადი ნომერი უნდა შეიცავდეს 11 ციფრს"),
  accountNumber: z
    .string()
    .regex(/^GE[0-9]{2}[A-Z0-9]{18}$/, "არასწორი IBAN ფორმატი")
    .refine((value) => value.length === 22, "IBAN უნდა შეიცავდეს 22 სიმბოლოს"),
  beneficiaryBankCode: z
    .string()
    .min(1, "ბანკი აუცილებელია"),
  artistSlug: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine(
      (value) =>
        value === "" ||
        (value.length >= 3 && value.length <= 40 && SLUG_PATTERN.test(value)),
      {
        message: SLUG_VALIDATION_MESSAGE,
        path: ["artistSlug"],
      }
    ),
  invitationCode: z.string().optional(), // renamed from referralCode
});
