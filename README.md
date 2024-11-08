# Remote Controller

Remote Controller is the easiest way to interact across Websockets, Webworkers and WebRTC. The library is small, dependancy free, performant and powerful.

```
$ npm install --save remote-controller
```

## Introduction

Whether it is a browser talking to a NodeJs server, or a the main Javascript thread talking to a Webworker, a frightening amount of code is dedicated to solving one fundimental problem: allowing two Javascript instances to communicate with each other.

This library is an attempt to create the most seamless communication system possible within the limits of the Javascript language. It accomplishes this by allowing you to create a controller for a remote Javascript object that exists on another Javascript instance.

This controller give you access to all of the properties of the remote instance, lets you call its functions with arguments, attach listeners, modify its properties or practically anything you could do a normal object with virtually the same sytax.


## Examples

## API

## Uses

This library has potential to be used in any situation where two Javascript instances need to communicate. A major inspiration to this project was the desire to create an enhanced version of Google's [Comlink][comlink] so it should be a perfect fit for any project where that could be used. It is currently in use by Chthonic Software Inc. to centrally manage a browser based peer to peer video streaming network.

The most important factor to consider when deciding whether or not to use Remote Controller is security. Because of the amount of power a controller gives over a remote it can be used freely between secured contexts, or from a secure context to control an object in an insecure context, but it should never be used to control an object in a secured context from an insecure context. For example it is perfectly fine to use a server (secured context) to control objects on a user's browser (insecure context), or from the main Javascript thread (secure context) to a worker (secured context). However, an external user's browser (insecure context) should not be given remote control over an object on your server (secured context). Similarly, another user's browser (insecured context) should not be given control over an object in the current user's browser (secured context). 

## Further Work

There are two main enhancements that would be valuable for this library

1. Type support

2. Security

Unfortunately due to the complexity of the **Remote** type, current Typescript cannot accurately define all of its features. Hopefully in newer versions of Typescript this will be possible, or some brilliant developer finds a workaround (possilby a LSP extension?).

The main limitation in use for this library is that it shouldn't be used from insecure contexts, but I am fairly certain that a secured version of a Remote could exist which would allow this library to replace something like a REST API. I would really appreciate any ideas or discussions about how this could be achieved. 

[comlink]: https://github.com/GoogleChromeLabs/comlink

License Apache-2.0
