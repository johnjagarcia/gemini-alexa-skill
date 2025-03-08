require("dotenv").config();

const express = require("express");
const { ExpressAdapter } = require("ask-sdk-express-adapter");
const Alexa = require("ask-sdk-core");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        "¡Hola! Bienvenido a tu skill con integración de Gemini. Dime qué quieres preguntar."
      )
      .reprompt("¿Cómo puedo ayudarte?")
      .getResponse();
  },
};

const GeminiIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GeminiIntent"
    );
  },
  async handle(handlerInput) {
    const message = Alexa.getSlotValue(handlerInput.requestEnvelope, "message");

    if (!message) {
      return handlerInput.responseBuilder
        .speak("No entendí tu pregunta, por favor repítela.")
        .reprompt("¿Qué quieres saber?")
        .getResponse();
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(message);

      const answer = result.response.text();
      console.log(answer);

      return handlerInput.responseBuilder
        .speak(answer)
        .reprompt("¿Quieres preguntar algo más?")
        .getResponse();
    } catch (error) {
      console.error(
        "Error con GenIA:",
        error.response ? error.response.data : error.message
      );
      return handlerInput.responseBuilder
        .speak("Hubo un problema al consultar Gemini. Intenta más tarde.")
        .getResponse();
    }
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`Error: ${error.message}`);
    return handlerInput.responseBuilder
      .speak("Ocurrió un error. Por favor, intenta de nuevo.")
      .getResponse();
  },
};

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler, GeminiIntentHandler)
  .addErrorHandlers(ErrorHandler)
  .create();

const adapter = new ExpressAdapter(skill, false, false);

app.post("/alexa", adapter.getRequestHandlers());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Alexa corriendo en el puerto ${PORT}`);
});
