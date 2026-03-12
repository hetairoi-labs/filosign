#!/usr/bin/env bun
import { bundle } from "./bundler";
import { summary } from "./summary";

const { result, duration } = await bundle();
summary(result.outputs, duration);
