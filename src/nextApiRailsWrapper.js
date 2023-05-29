// nextApiRailsWrapper.js

const mimeTypes = {
  html: "text/html",
  plain: "text/plain",
  json: "application/json",
  xml: "application/xml",
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  css: "text/css",
  javascript: "application/javascript",
  csv: "text/csv",
  excel: "application/vnd.ms-excel",
  word: "application/msword",
  powerpoint: "application/vnd.ms-powerpoint",
  zip: "application/zip",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mpeg: "video/mpeg",
  mp4: "video/mp4",
};

// Define the wrapper function
const createApiRailsHandlers = (controller, authenticationProxy) => {
  return async (req, res) => {
    const { method, url } = req;
    let authenticatedUser = null;

    const baseUrl = Object.keys(controller)[0];
    const parsedController = { ...controller[baseUrl] };
    const pathParts = url.split(baseUrl);
    pathParts.shift();
    const controllerPath = pathParts.join("/");
    // If the controller doesn't have the method, return 405
    const actionName = parseUrlToMethod(controllerPath, method);
    const action = parsedController[actionName];

    const requiresAuthentication =
      (parsedController.authenticate &&
        parsedController.authenticate === true) ||
      (parsedController.authenticate &&
        Array.isArray(parsedController.authenticate) &&
        parsedController.authenticate.includes(actionName));

    if (
      requiresAuthentication &&
      authenticationProxy &&
      typeof authenticationProxy === "function"
    ) {
      authenticatedUser = await authenticationProxy(req);

      if (!authenticatedUser) {
        res.status(401).end("Unauthorized");
        return;
      }
    }

    if (!action) {
      res.setHeader("Allow", Object.keys(parsedController));
      res
        .status(405)
        .end(
          `Unsupported action ${parseUrlToMethod(
            controllerPath,
            method
          )}, only ${Object.keys(parsedController)} are supported`
        );
      return;
    }

    const beforeActions = parsedController.beforeActions || [];
    const afterActions = parsedController.afterActions || [];

    try {
      whitelistBodyParams(req, action);
      await runActions(beforeActions, req, res, authenticatedUser);
      await runAction(action, req, res, authenticatedUser);
      await runActions(afterActions, req, res, authenticatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).end("Internal Server Error");
    }
  };
};

const whitelistBodyParams = (req, action) => {
  if (typeof action === "object" && Array.isArray(action["whitelist"])) {
    const body = req.body;
    const whitelistedBody = {};
    const rejectedBody = [];
    action["whitelist"].map((key) => {
      if (body[key]) {
        whitelistedBody[key] = body[key];
      } else {
        rejectedBody.push(key);
      }
    });
    if (rejectedBody.length > 0) {
      console.warn(
        `${req.method} ${
          req.url
        }: The following body params were rejected: ${rejectedBody.join(", ")}`
      );
    }
    req.body = whitelistedBody;
  }
};
// Define the respondTo function
const respondTo = (mimeType, handler) => {
  return (req, res) => {
    const acceptHeaders = req.headers["accept"].split(";") || [
      mimeTypes["json"],
      mimeTypes["html"],
    ];
    if (acceptHeaders && acceptHeaders.includes(mimeTypes[mimeType])) {
      res.setHeader("Content-Type", mimeTypes[mimeType]);
      handler(req, res);
    } else {
      res.status(406).end("Not Acceptable");
    }
  };
};

const runAction = async (action, req, res, authenticatedUser) => {
  if (typeof action === "function") {
    await action(req, res, authenticatedUser);
  } else if (
    typeof action === "object" &&
    typeof action["handler"] === "function"
  ) {
    await action["handler"](req, res, authenticatedUser);
  }
};

const runActions = async (actions, req, res, authenticatedUser) => {
  actions.map(async (action) => {
    await runAction(action, req, res, authenticatedUser);
  });
};

const parseUrlToMethod = (url, httpMethod) => {
  const urlParts = url.split("/");

  switch (httpMethod) {
    case "GET":
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart === "new") {
        return `new`;
      } else if (lastPart === "edit") {
        return `edit`;
      } else if (urlParts.length === 1) {
        return `index`;
      } else {
        return `show`;
      }
    case "POST":
      return `create`;
    case "PUT":
    case "PATCH":
      return `update`;
    case "DELETE":
      return `destroy`;
    default:
      return httpMethod.toLowerCase();
  }
};

// Define the Rails-inspired interface DSL
const railsApi = (controller, authenticationProxy) => {
  return createApiRailsHandlers(controller, authenticationProxy);
};

module.exports = { railsApi, respondTo };
