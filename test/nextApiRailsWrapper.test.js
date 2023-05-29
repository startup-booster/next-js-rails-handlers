// nextApiRailsWrapper.test.js

const createApiRailsHandlers = require("../src/nextApiRailsWrapper");
const nextConnect = require("next-connect");
const supertest = require("supertest");

describe("nextApiRailsWrapper", () => {
  let controller;
  let app;

  beforeEach(() => {
    controller = {
      get: jest.fn(),
      post: jest.fn(),
    };

    app = nextConnect();
    app.use(createApiRailsHandlers(controller));
  });

  it("should handle GET request and execute action", async () => {
    controller.get.mockImplementation((req, res) => {
      res.status(200).json({ message: "GET request handled" });
    });

    const response = await supertest(app).get("/").expect(200);

    expect(controller.get).toHaveBeenCalled();
    expect(response.body).toEqual({ message: "GET request handled" });
  });

  it("should handle POST request and execute action", async () => {
    controller.post.mockImplementation((req, res) => {
      res.status(201).json({ message: "POST request handled" });
    });

    const response = await supertest(app).post("/").expect(201);

    expect(controller.post).toHaveBeenCalled();
    expect(response.body).toEqual({ message: "POST request handled" });
  });

  it("should handle unsupported method and return 405 error", async () => {
    const response = await supertest(app).put("/").expect(405);

    expect(response.text).toEqual("Method PUT Not Allowed");
  });

  // Add more test cases for other scenarios
});
