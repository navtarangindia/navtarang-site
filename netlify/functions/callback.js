exports.handler = async (event) => {
  const params = new URLSearchParams(event.queryStringParameters);
  const code = params.get("code");
  const state = params.get("state"); // this will be USER_1

  const userId = state.replace("USER_", "");

  if (!code) {
    return { statusCode: 400, body: "Missing code" };
  }

  // Exchange code for tokens...
  // Store tokens in DB under userId
};
