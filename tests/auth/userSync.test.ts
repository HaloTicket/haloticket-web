// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import axiosClient from "@/services/axiosClient";
import { userApi } from "@/services/userApi";

describe("Google user synchronization", () => {
  beforeEach(() => window.localStorage.clear());

  it("does not report a saved avatar or change cache when the backend rejects the update", async () => {
    localStorage.setItem("haloticket_user_profile", JSON.stringify({ email: "lan@example.com", avatarUrl: "https://example.com/old.png" }));
    axiosClient.defaults.adapter = async () => { throw new Error("Update failed"); };
    await expect(userApi.updateProfile({ fullName: "Lan", avatarUrl: "https://example.com/new.png" })).rejects.toThrow("Update failed");
    expect(JSON.parse(localStorage.getItem("haloticket_user_profile")!).avatarUrl).toBe("https://example.com/old.png");
  });

  it("persists the profile returned by the authenticated /users/me endpoint", async () => {
    const profile = {
      email: "lan@example.com",
      fullName: "Lan Nguyen",
      roles: ["USER"],
    };
    axiosClient.defaults.adapter = async (config) => ({
      config,
      data: profile,
      headers: {},
      status: 200,
      statusText: "OK",
    });

    await expect(userApi.syncCurrentUser()).resolves.toEqual(profile);
    expect(
      JSON.parse(
        window.localStorage.getItem("haloticket_user_profile") ?? "null",
      ),
    ).toEqual(profile);
  });

  it("keeps the original Google picture when the HaloTicket profile avatar changes", async () => {
    const googleAccount = {
      name: "Trần Công Minh",
      email: "minhtran2st@gmail.com",
      picture: "https://lh3.googleusercontent.com/google-picture",
    };
    window.localStorage.setItem(
      "haloticket_last_google_account",
      JSON.stringify(googleAccount),
    );
    axiosClient.defaults.adapter = async (config) => ({
      config,
      data: {
        email: googleAccount.email,
        fullName: googleAccount.name,
        avatarUrl: "https://cdn.haloticket.vn/avatars/uploaded-by-user.jpg",
      },
      headers: {},
      status: 200,
      statusText: "OK",
    });

    await userApi.updateProfile({
      fullName: googleAccount.name,
      avatarUrl: "https://cdn.haloticket.vn/avatars/uploaded-by-user.jpg",
    });

    expect(
      JSON.parse(
        window.localStorage.getItem("haloticket_last_google_account") ?? "null",
      ),
    ).toEqual(googleAccount);
  });
});
