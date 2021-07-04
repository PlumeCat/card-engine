// $.js

export const $ = id => document.getElementById(id)
export const $$ = selector => document.querySelector(selector)  // todo maybe rename these... perhaps actually have a querySelectorAll which uses "$"
export const $$$ = selector => document.querySelectorAll(selector)  // todo this is getting ridiculous