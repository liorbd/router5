import { Router, Route } from '../types/router'
import { RouteNode } from '..'

export default function withRoutes(routes: Route[] | RouteNode) {
    return (router: Router): Router => {
        const rootNode =
            routes instanceof RouteNode
                ? routes
                : new RouteNode('', '', routes, onRouteAdded)

        function onRouteAdded(route) {
            // if (route.canActivate) router.canActivate(route.name, route.canActivate)

            // if (route.forwardTo) router.forward(route.name, route.forwardTo)

            if (route.decodeParams)
                router.config.decoders[route.name] = route.decodeParams

            if (route.encodeParams)
                router.config.encoders[route.name] = route.encodeParams

            if (route.defaultParams)
                router.config.defaultParams[route.name] = route.defaultParams
        }

        router.rootNode = rootNode

        router.add = (routes, finalSort?) => {
            rootNode.add(routes, onRouteAdded, !finalSort)
            if (finalSort) {
                rootNode.sortDescendants()
            }
            return router
        }

        router.addNode = (name, path, canActivateHandler?): Router => {
            rootNode.addNode(name, path)
            // if (canActivateHandler) router.canActivate(name, canActivateHandler)
            return router
        }

        router.isActive = (
            name,
            params = {},
            strictEquality = false,
            ignoreQueryParams = true
        ) => {
            const activeState = router.getState()

            if (!activeState) return false

            if (strictEquality || activeState.name === name) {
                return router.areStatesEqual(
                    router.makeState(name, params),
                    activeState,
                    ignoreQueryParams
                )
            }

            return router.areStatesDescendants(
                router.makeState(name, params),
                activeState
            )
        }

        router.buildPath = (route, params) => {
            if (route === constants.UNKNOWN_ROUTE) {
                return params.path
            }

            const paramsWithDefault = {
                ...router.config.defaultParams[route],
                ...params
            }

            const {
                trailingSlashMode,
                queryParamsMode,
                queryParams
            } = router.getOptions()
            const encodedParams = router.config.encoders[route]
                ? router.config.encoders[route](paramsWithDefault)
                : paramsWithDefault

            return router.rootNode.buildPath(route, encodedParams, {
                trailingSlashMode,
                queryParamsMode,
                queryParams
            })
        }

        router.matchPath = (path, source) => {
            const options = router.getOptions()
            const match = router.rootNode.matchPath(path, options)

            if (match) {
                const { name, params, meta } = match
                const decodedParams = router.config.decoders[name]
                    ? router.config.decoders[name](params)
                    : params
                const { name: routeName, params: routeParams } = forwardState(
                    name,
                    decodedParams
                )
                const builtPath =
                    options.rewritePathOnMatch === false
                        ? path
                        : router.buildPath(routeName, routeParams)

                return router.makeState(routeName, routeParams, builtPath, {
                    params: meta,
                    source
                })
            }

            return null
        }

        router.setRootPath = rootPath => {
            router.rootNode.setPath(rootPath)
        }

        return router
    }
}
