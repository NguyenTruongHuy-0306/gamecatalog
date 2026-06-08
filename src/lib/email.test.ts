import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "mock-email-id" }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { sendVerificationEmail, sendSignupOtpEmail, sendPasswordResetEmail } from "./email";

describe("sendVerificationEmail", () => {
  beforeEach(() => {
    process.env.RESEND_FROM_EMAIL = "noreply@test.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";
    mockSend.mockClear();
  });

  afterEach(() => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("sends to the right address with the correct subject", async () => {
    await sendVerificationEmail("user@example.com", "tok123");
    const args = mockSend.mock.calls[0][0];
    expect(args.to).toBe("user@example.com");
    expect(args.from).toBe("noreply@test.com");
    expect(args.subject).toBe("Verify your GameCatalog account");
  });

  it("includes the verification URL with the token in the body", async () => {
    await sendVerificationEmail("user@example.com", "mytoken");
    const { html } = mockSend.mock.calls[0][0];
    expect(html).toContain("https://myapp.com/verify-email?token=mytoken");
  });

  it("falls back to default from-address when env var is unset", async () => {
    delete process.env.RESEND_FROM_EMAIL;
    await sendVerificationEmail("user@example.com", "tok");
    expect(mockSend.mock.calls[0][0].from).toBe("noreply@gamecatalog.dev");
  });
});

describe("sendSignupOtpEmail", () => {
  beforeEach(() => mockSend.mockClear());

  it("sends to the correct address with the OTP subject", async () => {
    await sendSignupOtpEmail("user@example.com", "123456");
    const args = mockSend.mock.calls[0][0];
    expect(args.to).toBe("user@example.com");
    expect(args.subject).toBe("Your GameCatalog verification code");
  });

  it("includes the OTP code in the email body", async () => {
    await sendSignupOtpEmail("user@example.com", "654321");
    expect(mockSend.mock.calls[0][0].html).toContain("654321");
  });
});

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";
    mockSend.mockClear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("sends with the correct subject", async () => {
    await sendPasswordResetEmail("user@example.com", "reset-tok");
    expect(mockSend.mock.calls[0][0].subject).toBe("Reset your GameCatalog password");
  });

  it("includes the reset URL with the token in the body", async () => {
    await sendPasswordResetEmail("user@example.com", "my-reset-token");
    expect(mockSend.mock.calls[0][0].html).toContain(
      "https://myapp.com/reset-password?token=my-reset-token"
    );
  });
});
