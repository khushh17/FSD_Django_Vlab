export default function Aim() {
  return (
    <>
      <p>
        This experiment follows a single HTTP request through a Django project, from the moment
        the browser sends it to the moment the browser receives the response. On the way in, the
        request passes through the web server, the WSGI (or ASGI) server, Django’s request
        handler, the middleware listed in <code>MIDDLEWARE</code>, the URL resolver and finally
        a view. The view returns an <code>HttpResponse</code>, which travels back out through the
        same middleware in reverse order before it reaches the client.
      </p>
      <p>After completing this experiment, the student will be able to:</p>
      <ol>
        <li>
          Trace, in order, the stages a request passes through from the browser to a Django
          view and back.
        </li>
        <li>
          Explain the onion model of middleware: why the request passes through{' '}
          <code>MIDDLEWARE</code> top to bottom, why the response passes bottom to top, and what
          changes when a middleware short-circuits.
        </li>
        <li>
          Predict which view a given URL resolves to, and with which captured arguments, from a
          set of <code>urlpatterns</code>.
        </li>
        <li>
          Explain how the response produced by a view returns to the client through the
          middleware, the request handler and the server.
        </li>
      </ol>
    </>
  )
}
