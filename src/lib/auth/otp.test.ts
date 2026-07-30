import { afterEach, describe, expect, it } from "vitest";

import { clearOtp, setOtp, verifyOtp } from "@/lib/auth/otp";

describe("OTP store", () => {
  const email = "otp-test@example.com";

  afterEach(() => {
    clearOtp(email);
  });

  it("accepts a matching code before expiry", () => {
    setOtp(email, "123456", 60_000);
    expect(verifyOtp(email, "123456")).toBe(true);
  });

  it("rejects wrong code", () => {
    setOtp(email, "123456", 60_000);
    expect(verifyOtp(email, "000000")).toBe(false);
  });

  it("normalizes email casing", () => {
    setOtp("OTP-Test@Example.com", "654321", 60_000);
    expect(verifyOtp("otp-test@example.com", "654321")).toBe(true);
  });

  it("rejects expired codes", () => {
    setOtp(email, "123456", -1);
    expect(verifyOtp(email, "123456")).toBe(false);
  });

  it("clears codes after clearOtp", () => {
    setOtp(email, "123456", 60_000);
    clearOtp(email);
    expect(verifyOtp(email, "123456")).toBe(false);
  });
});
