require("dotenv").config();

const express = require("express");
const { ExpressAdapter } = require("ask-sdk-express-adapter");
const Alexa = require("ask-sdk-core");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
const GEMINI_MAX_OUTPUT_TOKENS = process.env.GEMINI_MAX_OUTPUT_TOKENS;
const GEMINI_TEMPERATURE = process.env.GEMINI_TEMPERATURE;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        "¡Hola! Bienvenido a tu skill con integración de Voz Inteligente. Dime qué quieres preguntar."
      )
      .reprompt("¿Cómo puedo ayudarte?")
      .withShouldEndSession(false) // Mantiene la sesión abierta
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

      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: message,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: +GEMINI_MAX_OUTPUT_TOKENS,
          temperature: +GEMINI_TEMPERATURE,
        },
      });

      const answer = result.response.text();
      console.log(answer);

      return handlerInput.responseBuilder
        .speak(answer)
        .reprompt("¿Quieres preguntarle algo más a Voz Inteligente?")
        .withShouldEndSession(false) // Mantiene la sesión activa
        .getResponse();
    } catch (error) {
      console.error(
        "Error con GenIA:",
        error.response ? error.response.data : error.message
      );
      return handlerInput.responseBuilder
        .speak(
          "Hubo un problema al consultar a Voz Inteligente. Intenta más tarde."
        )
        .getResponse();
    }
  },
  canFulfillIntent(handlerInput) {
    return {
      canFulfill: "YES",
      slots: {},
    };
  },
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.StopIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.CancelIntent")
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Entendido...")
      .reprompt("¿Necesitas algo más?") // Deja la sesión abierta
      .withShouldEndSession(false)
      .getResponse();
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
  .addRequestHandlers(
    LaunchRequestHandler,
    GeminiIntentHandler,
    StopIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

const adapter = new ExpressAdapter(skill, false, false);

app.post("/alexa", adapter.getRequestHandlers());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Alexa corriendo en el puerto ${PORT}`);
});
